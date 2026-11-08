import { notFound } from "next/navigation";
import { exigirGestorLouvor } from "@/lib/louvor/acesso";
import { obterMusica } from "@/lib/louvor/consultas";
import type { DadosMusica } from "@/lib/louvor/esquema";
import { FormularioMusica } from "@/components/louvor/formulario-musica";

export const metadata = { title: "Editar música — Igreja Batista em Largo da Ideia" };

export default async function PaginaEditarMusica({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  await exigirGestorLouvor();
  const m = await obterMusica(params.id);
  if (!m) notFound();
  const inicial: DadosMusica = {
    titulo: m.titulo,
    artista: m.artista ?? "",
    tom_original: m.tom_original ?? "",
    bpm: m.bpm ? String(m.bpm) : "",
    compasso: m.compasso as DadosMusica["compasso"],
    tags: m.tags.join(", "),
    link_referencia: m.link_referencia ?? "",
    letra: m.letra ?? "",
    cifra: m.cifra ?? "",
    licenca: m.licenca,
    licenca_detalhe: m.licenca_detalhe ?? "",
  };
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Editar música</h1>
      <FormularioMusica inicial={inicial} musicaId={m.id} />
    </div>
  );
}
