import Link from "next/link";
import { exigirParticipanteLouvor } from "@/lib/louvor/acesso";
import { listarEventos, obterMeuMembroId } from "@/lib/cultos/consultas";
import { listarParticipantes } from "@/lib/ministerios/consultas";
import { listarEscalasLouvor, listarRepertoriosPorEvento } from "@/lib/louvor/consultas";
import { dataLonga, formatarHora, somarDias } from "@/lib/datas";
import { hojeBr } from "@/lib/financeiro/periodo";
import { linkWhatsApp, saudacaoPastoral } from "@/lib/whatsapp";
import { EscalaLouvor } from "@/components/louvor/acoes-louvor";

export const metadata = { title: "Agenda do Louvor — Igreja Batista em Largo da Ideia" };

export default async function PaginaAgendaLouvor() {
  const { usuario, perfil } = await exigirParticipanteLouvor();
  if (!perfil.louvorId) {
    return <p className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">O ministério “Louvor” não foi encontrado. Cadastre-o em Ministérios.</p>;
  }
  const hoje = hojeBr();
  const eventos = (await listarEventos(hoje, somarDias(hoje, 45))).filter((e) => e.ministerio_id === perfil.louvorId && e.status !== "cancelado");
  const ids = eventos.map((e) => e.id);
  const porId = new Map(eventos.map((e) => [e.id, e]));
  // Link "abrir conversa" só para quem gerencia o Louvor; o número fica no servidor e a mensagem não leva dados sensíveis.
  const gerarLink = perfil.gere
    ? (c: { whatsapp: string | null; membro_nome: string; funcao: string; evento_id: string }) => {
        const ev = porId.get(c.evento_id);
        if (!ev) return null;
        return linkWhatsApp(
          c.whatsapp,
          `${saudacaoPastoral(c.membro_nome)}Você está escalado(a) como ${c.funcao} em "${ev.titulo}", ${dataLonga(ev.data)} às ${formatarHora(ev.hora_inicio)}. Pode confirmar pelo sistema? Obrigado!`,
        );
      }
    : undefined;
  const [escalas, repertorios, meuMembroId, participantes] = await Promise.all([
    listarEscalasLouvor(ids, perfil.louvorId, gerarLink),
    listarRepertoriosPorEvento(ids),
    obterMeuMembroId(usuario.id),
    listarParticipantes(perfil.louvorId),
  ]);
  const membros = participantes.filter((p) => p.situacao === "ativo").map((p) => ({ id: p.membro_id, nome_completo: p.nome }));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Agenda e escalas do Louvor</h1>
          <p className="text-sm text-muted-foreground">Próximos 45 dias. A escala é a mesma da agenda geral de cultos; a lista de escalados oferece os participantes do ministério.</p>
        </div>
        {perfil.gere && <Link href="/cultos/novo" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Novo ensaio ou culto</Link>}
      </div>

      {eventos.length === 0 && <p className="cartao p-5 text-sm text-muted-foreground">Nenhum evento do ministério de Louvor nos próximos 45 dias. Ao criar um evento, escolha “Louvor” como ministério responsável.</p>}
      {eventos.map((e) => {
        const rep = repertorios.get(e.id);
        return (
          <section key={e.id} className="cartao space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold"><Link href={`/cultos/${e.id}`} className="hover:underline">{e.titulo}</Link></h2>
                <p className="text-sm text-muted-foreground">{dataLonga(e.data)} · {formatarHora(e.hora_inicio)}{e.local ? ` · ${e.local}` : ""}</p>
              </div>
              {rep ? (
                <Link href={`/louvor/repertorios/${rep.id}`} className="text-sm underline">Repertório ({rep.status})</Link>
              ) : perfil.gere ? (
                <Link href={`/louvor/repertorios/novo?evento=${e.id}`} className="text-sm underline">Criar repertório</Link>
              ) : null}
            </div>
            <EscalaLouvor
              eventoId={e.id}
              louvorId={perfil.louvorId as string}
              itens={escalas.get(e.id) ?? []}
              membros={membros}
              podeGerir={perfil.gere}
              meuMembroId={meuMembroId}
              cancelado={e.status === "cancelado"}
            />
          </section>
        );
      })}
    </div>
  );
}
