import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarParticipantes, ministeriosQueLidera, obterMinisterio } from "@/lib/ministerios/consultas";
import { listarMembrosAtivos, obterMeuMembroId } from "@/lib/cultos/consultas";
import {
  AcoesParticipante,
  BotaoAlternarMinisterio,
  FormAdicionarParticipante,
  FormMinisterio,
} from "@/components/ministerios/gestao";

export const metadata = { title: "Ministério — Igreja Batista em Largo da Ideia" };

export default async function PaginaMinisterio({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");

  const ministerio = await obterMinisterio(params.id);
  if (!ministerio) notFound();

  // O líder só acessa os ministérios que lidera.
  if (usuario.papel === "lider_ministerio") {
    const meu = await obterMeuMembroId(usuario.id);
    const ids = meu ? await ministeriosQueLidera(meu) : [];
    if (!ids.includes(ministerio.id)) redirect("/ministerios");
  }

  const gestaoMinisterio = usuario.papel === "administrador" || usuario.papel === "pastor";
  const gestaoParticipantes = gestaoMinisterio || usuario.papel === "secretario";

  const participantes = await listarParticipantes(ministerio.id);
  const ja = new Set(participantes.map((p) => p.membro_id));
  const candidatos = gestaoParticipantes
    ? (await listarMembrosAtivos()).filter((m) => !ja.has(m.id))
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">{ministerio.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {ministerio.descricao ?? "Sem descrição."}
            {!ministerio.ativo && " · Ministério inativo"}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href="/ministerios" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar</Link>
          {gestaoMinisterio && <BotaoAlternarMinisterio id={ministerio.id} nome={ministerio.nome} ativo={ministerio.ativo} />}
        </div>
      </div>

      {gestaoMinisterio && (
        <section className="cartao p-5">
          <h2 className="titulo-secao mb-3">Dados do ministério</h2>
          <FormMinisterio ministerio={ministerio} />
        </section>
      )}

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-3">Participantes ({participantes.length})</h2>
        <ul className="divide-y divide-border text-sm">
          {participantes.length === 0 && <li className="py-3 text-muted-foreground">Nenhum participante.</li>}
          {participantes.map((p) => (
            <li key={p.membro_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <Link href={`/membros/${p.membro_id}`} className="font-medium hover:underline">{p.nome}</Link>
                {p.funcao === "lider" && <span className="ml-2 rounded-full bg-dourado/30 px-2 py-0.5 text-xs">líder</span>}
                {p.situacao !== "ativo" && <span className="ml-2 text-xs text-muted-foreground">({p.situacao})</span>}
              </span>
              {gestaoParticipantes && (
                <AcoesParticipante ministerioId={ministerio.id} membroId={p.membro_id} nome={p.nome} funcao={p.funcao} />
              )}
            </li>
          ))}
        </ul>
        {gestaoParticipantes && (
          <div className="mt-4 border-t border-border pt-4">
            <FormAdicionarParticipante ministerioId={ministerio.id} membros={candidatos} />
          </div>
        )}
        {!gestaoParticipantes && (
          <p className="mt-3 text-xs text-muted-foreground">
            A inclusão e a remoção de participantes são feitas pela secretaria, pelo pastor ou pelo administrador.
          </p>
        )}
      </section>
    </div>
  );
}
