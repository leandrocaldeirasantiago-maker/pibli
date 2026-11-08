import Link from "next/link";
import { Download, Plus, Search, Upload, UserCheck } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import {
  TAMANHO_PAGINA,
  buscarMembros,
  lerFiltros,
  listarMinisterios,
} from "@/lib/membros/consultas";
import { SITUACOES, formatarDataBr, formatarTelefone } from "@/lib/membros/esquema";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { cn } from "@/lib/utils";
import { linkWhatsApp, saudacaoPastoral } from "@/lib/whatsapp";

export const metadata = { title: "Membros — Igreja Batista em Largo da Ideia" };

const COR_SITUACAO: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  inativo: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  transferido: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  falecido: "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
};

export default async function PaginaMembros({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  const podeEditar = !!usuario && PAPEIS_GESTAO.includes(usuario.papel);
  const filtros = lerFiltros(searchParams);
  const rotuloSituacao = Object.fromEntries(SITUACOES);

  const [{ linhas, total }, ministerios] = await Promise.all([
    buscarMembros(filtros, (filtros.pagina - 1) * TAMANHO_PAGINA, TAMANHO_PAGINA),
    listarMinisterios(),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));

  const consulta = (pagina?: number) => {
    const p = new URLSearchParams();
    if (filtros.q) p.set("q", filtros.q);
    if (filtros.situacao) p.set("situacao", filtros.situacao);
    if (filtros.ministerio) p.set("ministerio", filtros.ministerio);
    if (pagina && pagina > 1) p.set("pagina", String(pagina));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const temFiltro = !!(filtros.q || filtros.situacao || filtros.ministerio);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Membros</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "registro encontrado" : "registros encontrados"}
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/membros/visitantes"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              <UserCheck className="h-4 w-4" /> Visitantes
            </Link>
            <Link
              href="/membros/importar"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              <Upload className="h-4 w-4" /> Importar CSV
            </Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- download (route handler), não é uma página; <Link> faria navegação em vez de baixar */}
            <a
              href={`/membros/exportar${consulta()}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </a>
            <Link
              href="/membros/novo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900"
            >
              <Plus className="h-4 w-4" /> Novo membro
            </Link>
          </div>
        )}
      </div>

      <form method="get" className="cartao grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar por nome</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={filtros.q}
            placeholder="Buscar por nome…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="sr-only">Situação</span>
          <select
            name="situacao"
            defaultValue={filtros.situacao}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Todas as situações</option>
            {SITUACOES.map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Ministério</span>
          <select
            name="ministerio"
            defaultValue={filtros.ministerio}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Todos os ministérios</option>
            {ministerios.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-10 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900"
          >
            Filtrar
          </button>
          {temFiltro && (
            <Link href="/membros" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">
              Limpar
            </Link>
          )}
        </div>
      </form>

      <div className="cartao overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Ministérios</th>
              <th className="px-4 py-3 font-medium">Ingresso</th>
              <th className="px-4 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {temFiltro
                    ? "Nenhum membro encontrado com esses filtros."
                    : "Nenhum membro cadastrado ainda."}
                </td>
              </tr>
            )}
            {linhas.map((m) => {
              const zap = linkWhatsApp(m.whatsapp, saudacaoPastoral(m.nome_completo));
              return (
                <tr key={m.id} className="hover:bg-muted">
                  <td className="px-4 py-3">
                    <Link href={`/membros/${m.id}`} className="font-medium text-marinho hover:underline dark:text-dourado">
                      {m.nome_completo}
                    </Link>
                    {m.familia && <p className="text-xs text-muted-foreground">Família {m.familia}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p>{formatarTelefone(m.telefone) || "—"}</p>
                    {zap && (
                      <a
                        href={zap}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 underline dark:text-emerald-300"
                      >
                        WhatsApp {formatarTelefone(m.whatsapp)}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.ministerios ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatarDataBr(m.data_ingresso) || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", COR_SITUACAO[m.situacao])}>
                      {rotuloSituacao[m.situacao] ?? m.situacao}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Paginação">
          {filtros.pagina > 1 ? (
            <Link href={`/membros${consulta(filtros.pagina - 1)}`} className="rounded-xl border border-border px-4 py-2 hover:bg-muted">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Página {filtros.pagina} de {totalPaginas}
          </span>
          {filtros.pagina < totalPaginas ? (
            <Link href={`/membros${consulta(filtros.pagina + 1)}`} className="rounded-xl border border-border px-4 py-2 hover:bg-muted">
              Próxima →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
