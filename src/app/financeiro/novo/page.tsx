import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarCategorias, listarContas, listarMembrosSelecao } from "@/lib/financeiro/consultas";
import { FormularioLancamento } from "@/components/financeiro/formulario-lancamento";

export const metadata = { title: "Novo lançamento — Igreja Batista em Largo da Ideia" };

export default async function PaginaNovoLancamento() {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !["administrador", "tesoureiro"].includes(usuario.papel)) redirect("/financeiro");

  const [categorias, contas, membros] = await Promise.all([
    listarCategorias(),
    listarContas(),
    listarMembrosSelecao(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Novo lançamento</h1>
        <p className="text-sm text-muted-foreground">Campos com * são obrigatórios.</p>
      </div>
      <FormularioLancamento
        categorias={categorias.filter((c) => c.ativa)}
        contas={contas.filter((c) => c.ativa)}
        membros={membros}
      />
    </div>
  );
}
