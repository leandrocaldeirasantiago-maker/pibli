import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { lerFiltrosLancamentos, listarLancamentos } from "@/lib/financeiro/consultas";
import { FORMAS_PAGAMENTO } from "@/lib/financeiro/esquema";
import { lerPeriodo } from "@/lib/financeiro/periodo";
import { formatarDataBr } from "@/lib/membros/esquema";
import { gerarCsv } from "@/lib/csv";

const LOTE = 1000;
const LIMITE_TOTAL = 20000;

export async function GET(request: NextRequest) {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !["administrador", "tesoureiro"].includes(usuario.papel)) {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  const filtros = lerFiltrosLancamentos(Object.fromEntries(request.nextUrl.searchParams));
  const periodo = lerPeriodo(filtros.periodo);

  const linhas = [];
  for (let offset = 0; offset < LIMITE_TOTAL; offset += LOTE) {
    // A exportação inclui os cancelados, marcados na coluna "Situação".
    const { linhas: lote } = await listarLancamentos({ ...filtros, cancelados: true }, periodo, offset, LOTE);
    linhas.push(...lote);
    if (lote.length < LOTE) break;
  }

  const formas = Object.fromEntries(FORMAS_PAGAMENTO);
  const csv = gerarCsv(
    ["Data", "Tipo", "Categoria", "Conta", "Forma de pagamento", "Valor (R$)", "Descrição", "Membro", "Situação", "Motivo do cancelamento"],
    linhas.map((l) => [
      formatarDataBr(l.data),
      l.tipo === "receita" ? "Receita" : "Despesa",
      l.categoria,
      l.conta,
      formas[l.forma] ?? l.forma,
      l.valor.toFixed(2).replace(".", ","),
      l.descricao ?? "",
      l.membro_nome ?? "",
      l.cancelado ? "Cancelado" : "Efetivado",
      l.motivo ?? "",
    ]),
  );

  // Exportação é registrada na auditoria: somente período, filtros e quantidade.
  const supabase = criarClienteServidor();
  await supabase.rpc("registrar_evento", {
    p_acao: "exportacao_financeiro",
    p_detalhes: {
      quantidade: linhas.length,
      periodo: periodo.valor,
      filtros: { tipo: filtros.tipo, categoria: filtros.categoria, conta: filtros.conta, q: filtros.q },
    },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${periodo.valor}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
