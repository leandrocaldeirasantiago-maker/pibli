import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarMinisterios } from "@/lib/membros/consultas";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { FormularioMembro } from "@/components/membros/formulario-membro";

export const metadata = { title: "Novo membro — Igreja Batista em Largo da Ideia" };

export default async function PaginaNovoMembro() {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !PAPEIS_GESTAO.includes(usuario.papel)) redirect("/membros");
  const ministerios = await listarMinisterios();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Novo membro</h1>
        <p className="text-sm text-muted-foreground">Campos com * são obrigatórios.</p>
      </div>
      <FormularioMembro ministerios={ministerios} />
    </div>
  );
}
