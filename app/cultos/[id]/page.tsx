import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import {
  listarEscalaDoEvento,
  listarInscricoes,
  listarMembrosAtivos,
  listarPresentes,
  obterEvento,
  obterMeuMembroId,
} from "@/lib/cultos/consultas";
import { ministeriosQueLidera } from "@/lib/ministerios/consultas";
import { TIPOS_EVENTO } from "@/lib/cultos/esquema";
import { dataLonga, formatarHora } from "@/lib/datas";
import { hojeBr } from "@/lib/financeiro/periodo";
import { linkWhatsApp, saudacaoPastoral } from "@/lib/whatsapp";
import { BotoesStatusEvento, PainelEscala, PainelInscricoes, PainelPresenca } from "@/components/cultos/acoes-evento";

export const metadata = { title: "Evento — Igreja Batista em Largo da Ideia" };

export default async function PaginaEvento({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");

  const evento = await obterEvento(params.id);
  if (!evento) notFound();

  const meuMembroId = await obterMeuMembroId(usuario.id);
  const gestaoGeral = ["administrador", "pastor", "secretario"].includes(usuario.papel);
  let ehLiderDoEvento = false;
  if (usuario.papel === "lider_ministerio" && evento.ministerio_id && meuMembroId) {
    ehLiderDoEvento = (await ministeriosQueLidera(meuMembroId)).includes(evento.ministerio_id);
  }
  // A palavra final é das políticas do banco; isto só decide o que mostrar na tela.
  const podeGerir = gestaoGeral || ehLiderDoEvento;
  const cancelado = evento.status === "cancelado";

  const [escala, inscritos, presentes, membros] = await Promise.all([
    listarEscalaDoEvento(evento.id, podeGerir),
    listarInscricoes(evento.id),
    podeGerir ? listarPresentes(evento.id) : Promise.resolve([] as string[]),
    podeGerir ? listarMembrosAtivos() : Promise.resolve([] as { id: string; nome_completo: string }[]),
  ]);

  // Link "abrir conversa" só para quem gerencia a escala; o número fica no servidor e a mensagem não leva dados sensíveis.
  const escalaComLinks = escala.map(({ whatsapp, ...i }) => ({
    ...i,
    link_whatsapp: podeGerir
      ? linkWhatsApp(
          whatsapp,
          `${saudacaoPastoral(i.membro_nome)}Você está escalado(a) como ${i.funcao} em "${evento.titulo}", ${dataLonga(evento.data)} às ${formatarHora(evento.hora_inicio)}. Pode confirmar pelo sistema? Obrigado!`,
        )
      : null,
  }));

  const rotuloTipo = Object.fromEntries(TIPOS_EVENTO)[evento.tipo] ?? evento.tipo;
  const rotuloStatus = { agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado" }[evento.status];

  // Candidatos à lista de presença: inscritos, escalados e quem já está marcado como presente.
  const nomes = new Map<string, string>();
  membros.forEach((m) => nomes.set(m.id, m.nome_completo));
  inscritos.forEach((i) => nomes.set(i.membro_id, i.nome));
  escala.forEach((e) => nomes.set(e.membro_id, e.membro_nome));
  const idsCandidatos = Array.from(new Set([...inscritos.map((i) => i.membro_id), ...escala.map((e) => e.membro_id), ...presentes]));
  const candidatos = idsCandidatos
    .map((id) => ({ id, nome: nomes.get(id) ?? "Membro" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{rotuloTipo}{!evento.publico && " · Evento interno"}</p>
          <h1 className={`font-serif text-2xl font-semibold lg:text-3xl ${cancelado ? "line-through" : ""}`}>{evento.titulo}</h1>
          <p className="mt-1 text-sm">
            {dataLonga(evento.data)} · {formatarHora(evento.hora_inicio)}
            {evento.hora_fim ? ` às ${formatarHora(evento.hora_fim)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href="/cultos" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar à agenda</Link>
          {podeGerir && evento.status === "agendado" && (
            <Link href={`/cultos/${evento.id}/editar`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900">
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          )}
          {podeGerir && <BotoesStatusEvento id={evento.id} titulo={evento.titulo} status={evento.status} jaAconteceu={evento.data <= hojeBr()} />}
        </div>
      </div>

      {cancelado && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">Este evento foi cancelado.</p>
      )}

      <section className="cartao p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Situação</dt><dd className="mt-0.5">{rotuloStatus}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Local</dt><dd className="mt-0.5">{evento.local ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Ministério</dt><dd className="mt-0.5">{evento.ministerio_nome ?? "Igreja toda"}</dd></div>
          {evento.descricao && (
            <div className="sm:col-span-3"><dt className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</dt><dd className="mt-0.5 whitespace-pre-line">{evento.descricao}</dd></div>
          )}
        </dl>
      </section>

      {evento.exige_inscricao && (
        <PainelInscricoes
          eventoId={evento.id}
          vagas={evento.vagas}
          aberto={evento.status === "agendado"}
          inscritos={inscritos}
          podeGerir={podeGerir}
          meuMembroId={meuMembroId}
          membros={membros}
        />
      )}

      <PainelEscala
        eventoId={evento.id}
        ministerioId={evento.ministerio_id}
        itens={escalaComLinks}
        membros={membros}
        podeGerir={podeGerir}
        meuMembroId={meuMembroId}
        eventoCancelado={cancelado}
      />

      {podeGerir && !cancelado && (
        <PainelPresenca eventoId={evento.id} candidatos={candidatos} presentesIniciais={presentes} outros={membros} />
      )}
    </div>
  );
}
