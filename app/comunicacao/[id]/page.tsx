import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarMinisteriosAtivos, obterMeuMembroId } from "@/lib/cultos/consultas";
import { ministeriosQueLidera } from "@/lib/ministerios/consultas";
import { obterAviso } from "@/lib/comunicacao/consultas";
import type { DadosAviso } from "@/lib/comunicacao/esquema";
import { FormularioAviso } from "@/components/comunicacao/formulario-aviso";

export const metadata = { title: "Editar aviso — Igreja Batista em Largo da Ideia" };

export default async function PaginaEditarAviso({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  const aviso = await obterAviso(params.id);
  if (!aviso) notFound();

  const ehLider = usuario.papel === "lider_ministerio";
  let ministerios = await listarMinisteriosAtivos();
  if (ehLider) {
    const meu = await obterMeuMembroId(usuario.id);
    const ids = meu ? await ministeriosQueLidera(meu) : [];
    if (aviso.publico_alvo !== "ministerio" || !aviso.ministerio_id || !ids.includes(aviso.ministerio_id)) redirect("/comunicacao");
    ministerios = ministerios.filter((m) => ids.includes(m.id));
  } else if (!["administrador", "pastor", "secretario"].includes(usuario.papel)) {
    redirect("/comunicacao");
  }

  const inicial: DadosAviso = {
    titulo: aviso.titulo,
    corpo: aviso.corpo,
    categoria: aviso.categoria as DadosAviso["categoria"],
    publico_alvo: aviso.publico_alvo as DadosAviso["publico_alvo"],
    ministerio_id: aviso.ministerio_id ?? "",
    fixado: aviso.fixado,
    publicar_em: aviso.publicar_em,
    expira_em: aviso.expira_em ?? "",
  };
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Editar aviso</h1>
      <FormularioAviso inicial={inicial} avisoId={aviso.id} ministerios={ministerios} somenteMinisterio={ehLider} />
    </div>
  );
}
