import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import {
  listarCategorias,
  listarContas,
  listarMembrosSelecao,
  obterLancamento,
} from "@/lib/financeiro/consultas";
import type { DadosLancamento } from "@/lib/financeiro/esquema";
import { FormularioLancamento } from "@/components/financeiro/formulario-lancamento";

export const metadata = { title: "Editar lançamento — Igreja Batista em Largo da Ideia" };

export default async function PaginaEditarLancamento({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario || !["administrador", "tesoureiro"].includes(usuario.papel)) redirect("/financeiro");

  const l = await obterLancamento(params.id);
  if (!l) notFound();
  if (l.cancelado_em) redirect("/financeiro");

  const [categorias, contas, membros] = await Promise.all([
    listarCategorias(),
    listarContas(),
    listarMembrosSelecao(),
  ]);

  const inicial: DadosLancamento = {
    tipo: l.tipo,
    categoria_id: l.categoria_id,
    conta_id: l.conta_id,
    valor: Number(l.valor).toFixed(2).replace(".", ","),
    data: l.data,
    forma: l.forma as DadosLancamento["forma"],
    descricao: l.descricao ?? "",
    membro_id: l.membro_id ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Editar lançamento</h1>
      <FormularioLancamento
        categorias={categorias.filter((c) => c.ativa || c.id === l.categoria_id)}
        contas={contas.filter((c) => c.ativa || c.id === l.conta_id)}
        membros={membros}
        inicial={inicial}
        lancamentoId={l.id}
      />
    </div>
  );
}
