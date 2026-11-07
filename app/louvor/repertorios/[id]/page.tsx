import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirParticipanteLouvor } from "@/lib/louvor/acesso";
import { listarItensRepertorio, listarMusicasAtivas, obterRepertorio } from "@/lib/louvor/consultas";
import { STATUS_REPERTORIO } from "@/lib/louvor/esquema";
import { dataLonga } from "@/lib/datas";
import { BotoesStatusRepertorio, PainelItens } from "@/components/louvor/acoes-louvor";
import { BotaoOffline } from "@/components/louvor/offline";
import { paginasDoRepertorio } from "@/lib/louvor/offline";

export const metadata = { title: "Repertório — Igreja Batista em Largo da Ideia" };

export default async function PaginaRepertorio({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const { perfil, usuario } = await exigirParticipanteLouvor();
  const r = await obterRepertorio(params.id);
  if (!r) notFound();
  const [itens, musicas] = await Promise.all([listarItensRepertorio(r.id), perfil.gere ? listarMusicasAtivas() : Promise.resolve([])]);
  const rotulo = Object.fromEntries(STATUS_REPERTORIO)[r.status];
  const editavel = perfil.gere && r.status !== "arquivado";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{rotulo}</p>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">{r.titulo}</h1>
          {r.evento_id && r.evento_titulo && (
            <p className="mt-1 text-sm">
              <Link href={`/cultos/${r.evento_id}`} className="underline">{r.evento_titulo}</Link>
              {r.evento_data ? ` · ${dataLonga(r.evento_data)}` : ""}
            </p>
          )}
          {r.observacoes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.observacoes}</p>}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href="/louvor/repertorios" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar</Link>
          {perfil.gere && <BotoesStatusRepertorio id={r.id} titulo={r.titulo} status={r.status} />}
        </div>
      </div>
      <PainelItens repertorioId={r.id} itens={itens} musicas={musicas} editavel={editavel} />

      {itens.length > 0 && <BotaoOffline paginas={paginasDoRepertorio(r.id, itens)} identificador={usuario.id} rotulo="Salvar repertório e cifras" />}

      {itens.length > 0 && (
        <section className="cartao p-5">
          <h2 className="titulo-secao mb-1">Cifras no tom do dia</h2>
          <p className="mb-3 text-xs text-muted-foreground">Abre cada música já transposta para o tom definido neste repertório (ou o tom original).</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {itens.map((i) => (
              <li key={i.id}>
                <Link className="underline" href={`/louvor/musicas/${i.musica_id}${i.tom ? `?tom=${encodeURIComponent(i.tom)}` : ""}`}>{i.titulo}</Link>
                <span className="text-muted-foreground"> · {i.tom ?? i.tom_original ?? "sem tom"}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
