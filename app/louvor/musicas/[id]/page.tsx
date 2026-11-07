import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { exigirParticipanteLouvor } from "@/lib/louvor/acesso";
import { obterMusica } from "@/lib/louvor/consultas";
import { LICENCAS } from "@/lib/louvor/esquema";
import { BotaoAlternarMusica } from "@/components/louvor/acoes-louvor";
import { VisualizadorCifra } from "@/components/louvor/visualizador-cifra";
import { BotaoFavorita } from "@/components/louvor/botao-favorita";
import { BotaoOffline } from "@/components/louvor/offline";
import { listarIdsFavoritas } from "@/lib/louvor/consultas-extra";

export const metadata = { title: "Música — Igreja Batista em Largo da Ideia" };

export default async function PaginaMusica({ params: paramsPromessa, searchParams: searchParamsPromessa }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await paramsPromessa;
  const searchParams = await searchParamsPromessa;
  const { perfil, usuario } = await exigirParticipanteLouvor();
  const m = await obterMusica(params.id);
  if (!m) notFound();
  const pedido = Array.isArray(searchParams.tom) ? searchParams.tom[0] : searchParams.tom;
  const tomPedido = pedido && /^[A-G][#b]?m?$/.test(pedido) ? pedido : null;
  const favoritas = await listarIdsFavoritas();
  const rotuloLicenca = LICENCAS.find(([v]) => v === m.licenca)?.[1] ?? m.licenca;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1 font-serif text-2xl font-semibold lg:text-3xl"><BotaoFavorita musicaId={m.id} titulo={m.titulo} favorita={favoritas.has(m.id)} />{m.titulo}{!m.ativo && <span className="ml-2 text-base text-amber-700">(inativa)</span>}</h1>
          {m.artista && <p className="text-sm text-muted-foreground">{m.artista}</p>}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href="/louvor/musicas" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar</Link>
          {perfil.gere && (
            <>
              <Link href={`/louvor/musicas/${m.id}/editar`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900"><Pencil className="h-4 w-4" /> Editar</Link>
              <BotaoAlternarMusica id={m.id} titulo={m.titulo} ativo={m.ativo} />
            </>
          )}
        </div>
      </div>

      <section className="cartao p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Tom original</dt><dd className="mt-0.5">{m.tom_original ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">BPM</dt><dd className="mt-0.5">{m.bpm ?? "—"}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Compasso</dt><dd className="mt-0.5">{m.compasso}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Etiquetas</dt><dd className="mt-0.5">{m.tags.join(", ") || "—"}</dd></div>
          <div className="sm:col-span-4"><dt className="text-xs uppercase tracking-wide text-muted-foreground">Base de autorização</dt><dd className="mt-0.5">{rotuloLicenca}{m.licenca_detalhe ? ` — ${m.licenca_detalhe}` : ""}</dd></div>
          {m.bpm && (
            <div className="sm:col-span-4"><dt className="text-xs uppercase tracking-wide text-muted-foreground">Ensaio</dt>
              <dd className="mt-0.5"><Link href={`/louvor/ferramentas?bpm=${m.bpm}&compasso=${encodeURIComponent(m.compasso)}`} className="underline">Abrir o metrônomo neste andamento</Link></dd></div>
          )}
          {m.link_referencia && (
            <div className="sm:col-span-4"><dt className="text-xs uppercase tracking-wide text-muted-foreground">Referência</dt>
              <dd className="mt-0.5"><a href={m.link_referencia} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Abrir <ExternalLink className="h-3 w-3" /></a></dd></div>
          )}
        </dl>
      </section>

      {m.letra || m.cifra ? (
        <VisualizadorCifra cifra={m.cifra} letra={m.letra} tomOriginal={m.tom_original} tomInicial={tomPedido ?? m.tom_original} />
      ) : (
        <p className="cartao p-5 text-sm text-muted-foreground">
          Sem letra nem cifra cadastradas.{m.licenca === "nenhuma" && " Esta música não tem base de autorização; use o link de referência."}
        </p>
      )}
      {(m.letra || m.cifra) && <BotaoOffline paginas={[`/louvor/musicas/${m.id}${tomPedido ? `?tom=${encodeURIComponent(tomPedido)}` : ""}`]} identificador={usuario.id} rotulo="Salvar esta música" />}
      <p className="text-xs text-muted-foreground">Uso restrito à equipe do ministério. Não copie nem redistribua letras e cifras fora do que a licença permite.</p>
    </div>
  );
}
