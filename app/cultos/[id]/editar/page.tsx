import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarMinisteriosAtivos, obterEvento, obterMeuMembroId } from "@/lib/cultos/consultas";
import { ministeriosQueLidera } from "@/lib/ministerios/consultas";
import type { DadosEvento } from "@/lib/cultos/esquema";
import { horaCurta } from "@/lib/datas";
import { FormularioEvento } from "@/components/cultos/formulario-evento";

export const metadata = { title: "Editar evento — Igreja Batista em Largo da Ideia" };

export default async function PaginaEditarEvento({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  const evento = await obterEvento(params.id);
  if (!evento) notFound();
  if (evento.status !== "agendado") redirect(`/cultos/${evento.id}`);

  const ehLider = usuario.papel === "lider_ministerio";
  let ministerios = await listarMinisteriosAtivos();
  if (ehLider) {
    const meu = await obterMeuMembroId(usuario.id);
    const ids = meu ? await ministeriosQueLidera(meu) : [];
    if (!evento.ministerio_id || !ids.includes(evento.ministerio_id)) redirect(`/cultos/${evento.id}`);
    ministerios = ministerios.filter((m) => ids.includes(m.id));
  } else if (!["administrador", "pastor", "secretario"].includes(usuario.papel)) {
    redirect(`/cultos/${evento.id}`);
  }

  const inicial: DadosEvento = {
    titulo: evento.titulo,
    tipo: evento.tipo as DadosEvento["tipo"],
    data: evento.data,
    hora_inicio: horaCurta(evento.hora_inicio),
    hora_fim: horaCurta(evento.hora_fim),
    local: evento.local ?? "",
    descricao: evento.descricao ?? "",
    ministerio_id: evento.ministerio_id ?? "",
    publico: evento.publico,
    exige_inscricao: evento.exige_inscricao,
    vagas: evento.vagas ? String(evento.vagas) : "",
    repetir_semanas: "0",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Editar evento</h1>
      <p className="text-sm text-muted-foreground">Se a data ou o horário mudarem, escalados e inscritos são avisados automaticamente. A alteração vale só para este evento, não para a série.</p>
      <FormularioEvento inicial={inicial} eventoId={evento.id} ministerios={ministerios} ministerioObrigatorio={ehLider} />
    </div>
  );
}
