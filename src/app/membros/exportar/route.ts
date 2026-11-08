import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { buscarMembros, lerFiltros } from "@/lib/membros/consultas";
import { ESTADOS_CIVIS, SITUACOES, formatarDataBr, formatarTelefone } from "@/lib/membros/esquema";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { gerarCsv } from "@/lib/csv";

const LOTE = 1000;
const LIMITE_TOTAL = 10000;

export async function GET(request: NextRequest) {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !PAPEIS_GESTAO.includes(usuario.papel)) {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filtros = lerFiltros(params);

  const linhas = [];
  for (let offset = 0; offset < LIMITE_TOTAL; offset += LOTE) {
    const { linhas: lote } = await buscarMembros(filtros, offset, LOTE);
    linhas.push(...lote);
    if (lote.length < LOTE) break;
  }

  const rotuloSituacao = Object.fromEntries(SITUACOES);
  const rotuloEstadoCivil = Object.fromEntries(ESTADOS_CIVIS);

  const csv = gerarCsv(
    [
      "Nome",
      "Situação",
      "Data de nascimento",
      "Telefone",
      "WhatsApp",
      "Estado civil",
      "Data de batismo",
      "Data de ingresso",
      "Cidade",
      "Família",
      "Ministérios",
    ],
    linhas.map((l) => [
      l.nome_completo,
      rotuloSituacao[l.situacao] ?? l.situacao,
      formatarDataBr(l.data_nascimento),
      formatarTelefone(l.telefone),
      formatarTelefone(l.whatsapp),
      l.estado_civil ? (rotuloEstadoCivil[l.estado_civil] ?? l.estado_civil) : "",
      formatarDataBr(l.data_batismo),
      formatarDataBr(l.data_ingresso),
      l.cidade ?? "",
      l.familia ?? "",
      l.ministerios ?? "",
    ]),
  );

  // Exportar dados pessoais é registrado na auditoria (LGPD): só filtros e quantidade.
  const supabase = criarClienteServidor();
  await supabase.rpc("registrar_evento", {
    p_acao: "exportacao_membros",
    p_detalhes: { quantidade: linhas.length, filtros: { ...filtros, pagina: undefined } },
  });

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="membros-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
