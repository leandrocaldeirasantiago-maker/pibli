import Link from "next/link";
import { CalendarDays, Gauge, ListMusic, Music, Users } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarEventos } from "@/lib/cultos/consultas";
import {
  contarMusicas,
  listarEscalasLouvor,
  listarMaisTocadas,
  listarRepertorioPublico,
  listarRepertoriosPorEvento,
  obterPerfilLouvor,
} from "@/lib/louvor/consultas";
import { dataLonga, formatarHora, somarDias } from "@/lib/datas";
import { hojeBr } from "@/lib/financeiro/periodo";
import { formatarDataBr } from "@/lib/membros/esquema";

export const metadata = { title: "Louvor — Igreja Batista em Largo da Ideia" };

const ATALHOS = [
  { href: "/louvor/musicas", titulo: "Biblioteca de músicas", texto: "Cadastro, tom, BPM e base de autorização.", icone: Music },
  { href: "/louvor/repertorios", titulo: "Repertórios", texto: "Monte e publique o repertório de cada culto.", icone: ListMusic },
  { href: "/louvor/agenda", titulo: "Agenda e escalas", texto: "Ensaios, cultos e equipe escalada.", icone: CalendarDays },
  { href: "/louvor/ensaios", titulo: "Ensaios e frequência", texto: "Presença de cada músico nos ensaios.", icone: Users },
  { href: "/louvor/ferramentas", titulo: "Metrônomo e afinador", texto: "Ferramentas para o ensaio.", icone: Gauge },
];

export default async function PaginaLouvor() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;
  const perfil = await obterPerfilLouvor();
  const hoje = hojeBr();

  // ---------- Visão do membro em geral: só os títulos dos repertórios publicados ----------
  if (!perfil.participa) {
    const linhas = await listarRepertorioPublico(hoje, somarDias(hoje, 14));
    const porEvento = new Map<string, typeof linhas>();
    for (const l of linhas) porEvento.set(l.evento_id, [...(porEvento.get(l.evento_id) ?? []), l]);
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Louvor</h1>
          <p className="text-sm text-muted-foreground">Músicas dos próximos cultos (repertórios publicados).</p>
        </div>
        {porEvento.size === 0 && <p className="cartao p-5 text-sm text-muted-foreground">Nenhum repertório publicado para os próximos 14 dias.</p>}
        {Array.from(porEvento.values()).map((itens) => (
          <section key={itens[0].repertorio_id} className="cartao p-5">
            <h2 className="titulo-secao">{itens[0].evento_titulo}</h2>
            <p className="mb-2 text-sm text-muted-foreground">{dataLonga(itens[0].data)} · {formatarHora(itens[0].hora_inicio)}</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {itens.map((i) => <li key={i.ordem}>{i.titulo}{i.artista ? <span className="text-muted-foreground"> — {i.artista}</span> : null}</li>)}
            </ol>
          </section>
        ))}
        <p className="text-xs text-muted-foreground">Letras e cifras ficam restritas à equipe do ministério de Louvor, por direitos autorais.</p>
      </div>
    );
  }

  // ---------- Visão da equipe ----------
  const [contagem, eventos, maisTocadas] = await Promise.all([
    contarMusicas(),
    listarEventos(hoje, somarDias(hoje, 21)),
    listarMaisTocadas(somarDias(hoje, -90), 5),
  ]);
  const deLouvor = eventos.filter((e) => e.ministerio_id === perfil.louvorId && e.status === "agendado").slice(0, 6);
  const ids = deLouvor.map((e) => e.id);
  const [escalas, repertorios] = await Promise.all([listarEscalasLouvor(ids, perfil.louvorId), listarRepertoriosPorEvento(ids)]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Louvor</h1>
        <p className="text-sm text-muted-foreground">{perfil.gere ? "Você gere o ministério de Louvor." : "Você faz parte da equipe de Louvor."}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Atalhos">
        {ATALHOS.map((a) => (
          <Link key={a.href} href={a.href} className="cartao flex gap-3 p-4 hover:bg-muted">
            <a.icone className="mt-0.5 h-5 w-5 shrink-0 text-dourado" />
            <span className="text-sm"><strong>{a.titulo}</strong><span className="block text-muted-foreground">{a.texto}</span></span>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Indicadores">
        <div className="cartao p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Músicas ativas</p><p className="text-2xl font-semibold">{contagem.ativas}</p></div>
        <div className="cartao p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Sem base de autorização</p><p className="text-2xl font-semibold">{contagem.semLicenca}</p><p className="text-xs text-muted-foreground">Só metadados e link; sem letra/cifra.</p></div>
        <div className="cartao p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Sem tom ou BPM</p><p className="text-2xl font-semibold">{contagem.semTomOuBpm}</p></div>
      </section>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-3">Próximos ensaios e cultos do Louvor (21 dias)</h2>
        {deLouvor.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento do ministério de Louvor agendado. {perfil.gere && <>Crie um em <Link href="/cultos/novo" className="underline">Cultos e eventos</Link>, escolhendo o ministério Louvor.</>}
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {deLouvor.map((e) => {
              const equipe = escalas.get(e.id) ?? [];
              const rep = repertorios.get(e.id);
              const aguardando = equipe.filter((x) => x.status === "pendente").length;
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <Link href={`/cultos/${e.id}`} className="font-medium hover:underline">{e.titulo}</Link>
                    <span className="block text-xs text-muted-foreground">{dataLonga(e.data)} · {formatarHora(e.hora_inicio)} · {equipe.length} escalado(s){aguardando > 0 ? ` · ${aguardando} aguardando resposta` : ""}</span>
                  </span>
                  {rep ? (
                    <Link href={`/louvor/repertorios/${rep.id}`} className="text-xs underline">Repertório ({rep.status})</Link>
                  ) : perfil.gere ? (
                    <Link href={`/louvor/repertorios/novo?evento=${e.id}`} className="text-xs underline">Criar repertório</Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem repertório</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-1 flex items-center gap-2"><Users className="h-5 w-5 text-dourado" /> Mais tocadas (90 dias)</h2>
        <p className="mb-2 text-xs text-muted-foreground">Conta só cultos já marcados como realizados.</p>
        <ul className="divide-y divide-border text-sm">
          {maisTocadas.length === 0 && <li className="py-2 text-muted-foreground">Ainda não há histórico.</li>}
          {maisTocadas.map((m) => (
            <li key={m.musica_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link href={`/louvor/musicas/${m.musica_id}`} className="hover:underline">{m.titulo}{m.artista ? <span className="text-muted-foreground"> — {m.artista}</span> : null}</Link>
              <span className="text-muted-foreground">{m.vezes}× · última em {formatarDataBr(m.ultima_vez)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
