import Link from "next/link";
import { ExternalLink, MessageCircle, Pin, Plus, Radio, Share2 } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarAvisos, listarLinks, listarMural, listarPedidosOracao, obterNomeIgreja } from "@/lib/comunicacao/consultas";
import { CATEGORIAS_AVISO, TIPOS_LINK, linkWhatsapp } from "@/lib/comunicacao/esquema";
import { formatarDataBr } from "@/lib/membros/esquema";
import { hojeBr } from "@/lib/financeiro/periodo";
import { cn } from "@/lib/utils";
import { AcoesPedido, BotaoAlternarLink, BotaoSituacaoAviso, FormLink, FormPedidoOracao } from "@/components/comunicacao/acoes-comunicacao";

export const metadata = { title: "Comunicação — Igreja Batista em Largo da Ideia" };

const ABAS = [
  ["avisos", "Mural de avisos"],
  ["oracao", "Oração"],
  ["links", "Links"],
] as const;

export default async function PaginaComunicacao({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;
  const bruto = Array.isArray(searchParams.aba) ? searchParams.aba[0] : searchParams.aba;
  const aba = ABAS.some(([v]) => v === bruto) ? (bruto as string) : "avisos";
  const gestao = ["administrador", "pastor", "secretario"].includes(usuario.papel);
  const pastoral = ["administrador", "pastor"].includes(usuario.papel);
  const podePublicar = gestao || usuario.papel === "lider_ministerio";
  const hoje = hojeBr();
  const rotuloCategoria = Object.fromEntries(CATEGORIAS_AVISO);
  const rotuloLink = Object.fromEntries(TIPOS_LINK);

  let conteudo: React.ReactNode;

  if (aba === "avisos") {
    const [avisos, igreja] = await Promise.all([listarAvisos(), obterNomeIgreja()]);
    conteudo = (
      <div className="space-y-3">
        {avisos.length === 0 && <p className="cartao p-5 text-sm text-muted-foreground">Nenhum aviso no momento.</p>}
        {avisos.map((a) => {
          const expirado = a.expira_em !== null && a.expira_em < hoje;
          const agendado = a.publicar_em > hoje;
          const visivelAoPublico = a.status === "publicado" && !expirado && !agendado;
          return (
            <article key={a.id} className={cn("cartao p-5", a.fixado && "border-dourado", !visivelAoPublico && "opacity-70")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">
                  {a.fixado && <Pin className="mr-1 inline h-4 w-4 text-dourado" aria-label="Fixado" />}
                  {a.titulo}
                </h2>
                <span className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5">{rotuloCategoria[a.categoria] ?? a.categoria}</span>
                  {a.publico_alvo === "lideranca" && <span className="rounded-full bg-muted px-2 py-0.5">Liderança</span>}
                  {a.publico_alvo === "ministerio" && <span className="rounded-full bg-muted px-2 py-0.5">{a.ministerio_nome ?? "Ministério"}</span>}
                  {a.status === "arquivado" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Arquivado</span>}
                  {a.status === "publicado" && expirado && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Expirado</span>}
                  {a.status === "publicado" && agendado && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">Agendado</span>}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{a.corpo}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Publicado em {formatarDataBr(a.publicar_em)}{a.expira_em ? ` · até ${formatarDataBr(a.expira_em)}` : ""}</span>
                {visivelAoPublico && a.publico_alvo === "todos" && (
                  <a href={linkWhatsapp(a.titulo, a.corpo, igreja)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                    <Share2 className="h-3 w-3" /> Compartilhar no WhatsApp
                  </a>
                )}
                {podePublicar && <Link href={`/comunicacao/${a.id}`} className="underline">Editar</Link>}
                {podePublicar && <BotaoSituacaoAviso id={a.id} titulo={a.titulo} status={a.status} />}
              </p>
            </article>
          );
        })}
      </div>
    );
  } else if (aba === "oracao") {
    const [pedidos, mural] = await Promise.all([listarPedidosOracao(), listarMural()]);
    const meus = pedidos.filter((p) => p.autor_id === usuario.id);
    const deOutros = pastoral ? pedidos.filter((p) => p.autor_id !== usuario.id) : [];
    const rotuloStatus = { aberto: "Em oração", respondido: "Respondido", arquivado: "Arquivado" } as const;
    conteudo = (
      <div className="space-y-5">
        <FormPedidoOracao />

        <section className="cartao p-5">
          <h2 className="titulo-secao mb-3">Mural de oração</h2>
          <ul className="divide-y divide-border text-sm">
            {mural.length === 0 && <li className="py-2 text-muted-foreground">Nenhum pedido no mural.</li>}
            {mural.map((p) => (
              <li key={p.id} className="py-3">
                <p className="whitespace-pre-line">{p.texto}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.nome_exibido} · {formatarDataBr(p.criado_em.slice(0, 10))}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao p-5">
          <h2 className="titulo-secao mb-3">Meus pedidos</h2>
          <ul className="divide-y divide-border text-sm">
            {meus.length === 0 && <li className="py-2 text-muted-foreground">Você ainda não fez pedidos.</li>}
            {meus.map((p) => (
              <li key={p.id} className="space-y-1 py-3">
                <p className="whitespace-pre-line">{p.texto}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarDataBr(p.criado_em.slice(0, 10))} · {rotuloStatus[p.status]} · {p.visibilidade === "mural" ? (p.anonimo ? "No mural (anônimo)" : "No mural") : "Só a liderança pastoral"}
                </p>
                <AcoesPedido id={p.id} status={p.status} ehAutor podeMarcar={pastoral} />
              </li>
            ))}
          </ul>
        </section>

        {pastoral && (
          <section className="cartao p-5">
            <h2 className="titulo-secao mb-1">Pedidos recebidos (liderança pastoral)</h2>
            <p className="mb-3 text-xs text-muted-foreground">Conteúdo sensível: use apenas para o cuidado pastoral. O acesso é restrito a administrador e pastor.</p>
            <ul className="divide-y divide-border text-sm">
              {deOutros.length === 0 && <li className="py-2 text-muted-foreground">Nenhum pedido recebido.</li>}
              {deOutros.map((p) => (
                <li key={p.id} className="space-y-1 py-3">
                  <p className="whitespace-pre-line">{p.texto}</p>
                  <p className="text-xs text-muted-foreground">{formatarDataBr(p.criado_em.slice(0, 10))} · {rotuloStatus[p.status]}</p>
                  <AcoesPedido id={p.id} status={p.status} ehAutor={false} podeMarcar />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  } else {
    const links = await listarLinks();
    conteudo = (
      <div className="space-y-5">
        <section className="cartao p-5">
          <h2 className="titulo-secao mb-3">Transmissões e grupos</h2>
          <ul className="divide-y divide-border text-sm">
            {links.length === 0 && <li className="py-2 text-muted-foreground">Nenhum link cadastrado.</li>}
            {links.map((l) => (
              <li key={l.id} className={cn("flex flex-wrap items-center justify-between gap-3 py-3", !l.ativo && "opacity-60")}>
                <span className="flex items-start gap-3">
                  {l.tipo === "transmissao" ? <Radio className="mt-0.5 h-5 w-5 text-dourado" /> : <MessageCircle className="mt-0.5 h-5 w-5 text-dourado" />}
                  <span>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
                      {l.titulo} <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="block text-xs text-muted-foreground">{rotuloLink[l.tipo]}{l.descricao ? ` · ${l.descricao}` : ""}{!l.ativo ? " · Inativo" : ""}</span>
                  </span>
                </span>
                {gestao && <BotaoAlternarLink id={l.id} ativo={l.ativo} />}
              </li>
            ))}
          </ul>
        </section>
        {gestao && <FormLink />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Comunicação</h1>
          <p className="text-sm text-muted-foreground">Avisos, oração e links da igreja.</p>
        </div>
        {aba === "avisos" && podePublicar && (
          <Link href="/comunicacao/novo" className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900">
            <Plus className="h-4 w-4" /> Novo aviso
          </Link>
        )}
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Seções">
        {ABAS.map(([v, r]) => (
          <Link key={v} href={`?aba=${v}`} aria-current={aba === v ? "page" : undefined}
            className={cn("inline-flex h-9 items-center rounded-xl border px-3 text-sm", aba === v ? "border-dourado bg-dourado text-marinho-900" : "border-border hover:bg-muted")}>
            {r}
          </Link>
        ))}
      </nav>
      {conteudo}
    </div>
  );
}
