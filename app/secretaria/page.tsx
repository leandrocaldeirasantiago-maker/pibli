import Link from "next/link";
import { FileBarChart, FilePlus2 } from "lucide-react";
import {
  TAMANHO_PAGINA_DOCS,
  lerFiltrosDocumentos,
  listarDocumentos,
  listarMovimentacoes,
} from "@/lib/secretaria/consultas";
import { TIPOS_DOCUMENTO } from "@/lib/secretaria/esquema";
import { formatarDataBr } from "@/lib/membros/esquema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Secretaria — Igreja Batista em Largo da Ideia" };

const dataBr = (iso: string) =>
  formatarDataBr(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso)));

const ROTULO_MOV: Record<string, string> = { batismo: "Batismo", ingresso: "Ingresso", transferencia: "Transferência" };

export default async function PaginaSecretaria({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const filtros = lerFiltrosDocumentos(searchParams);
  const [{ linhas, total }, movimentos] = await Promise.all([listarDocumentos(filtros), listarMovimentacoes(30)]);
  const rotulos = Object.fromEntries(TIPOS_DOCUMENTO);
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA_DOCS));

  const consulta = (pagina: number) => {
    const p = new URLSearchParams();
    if (filtros.tipo) p.set("tipo", filtros.tipo);
    if (filtros.q) p.set("q", filtros.q);
    if (pagina > 1) p.set("pagina", String(pagina));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Secretaria</h1>
          <p className="text-sm text-muted-foreground">Documentos numerados, relatórios e movimentações de membros.</p>
        </div>
        <Link href="/secretaria/relatorio" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
          <FileBarChart className="h-4 w-4" /> Relatório de membros
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Emitir documento">
        {TIPOS_DOCUMENTO.map(([v, r]) => (
          <Link key={v} href={`/secretaria/novo?tipo=${v}`} className="cartao flex items-center gap-3 p-4 text-sm font-medium transition-colors hover:bg-muted">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marinho text-dourado dark:bg-dourado dark:text-marinho-900">
              <FilePlus2 className="h-5 w-5" />
            </span>
            Emitir {r.toLowerCase()}
          </Link>
        ))}
      </section>

      <form method="get" className="cartao grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input type="search" name="q" defaultValue={filtros.q} aria-label="Buscar" placeholder="Buscar por número, nome ou título…" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <select name="tipo" defaultValue={filtros.tipo} aria-label="Tipo" className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
          <option value="">Todos os tipos</option>
          {TIPOS_DOCUMENTO.map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-xl bg-marinho px-4 text-sm font-medium text-white dark:bg-dourado dark:text-marinho-900">Filtrar</button>
      </form>

      <div className="cartao overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Número</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Membro</th>
              <th className="px-4 py-3 font-medium">Emissão</th>
              <th className="px-4 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Nenhum documento encontrado.</td></tr>
            )}
            {linhas.map((d) => (
              <tr key={d.id} className={cn(d.anulado_em && "text-muted-foreground")}>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/secretaria/${d.id}`} className="underline">{d.numero}</Link>
                </td>
                <td className="px-4 py-3">{rotulos[d.tipo] ?? d.tipo}<p className="text-xs text-muted-foreground">{d.titulo}</p></td>
                <td className="px-4 py-3">{d.membro_nome ?? "—"}</td>
                <td className="px-4 py-3">{dataBr(d.emitido_em)}</td>
                <td className="px-4 py-3">
                  {d.anulado_em ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">Anulado</span> : "Válido"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Paginação">
          {filtros.pagina > 1 ? <Link href={`/secretaria${consulta(filtros.pagina - 1)}`} className="rounded-xl border border-border px-4 py-2 hover:bg-muted">← Anterior</Link> : <span />}
          <span className="text-muted-foreground">Página {filtros.pagina} de {totalPaginas}</span>
          {filtros.pagina < totalPaginas ? <Link href={`/secretaria${consulta(filtros.pagina + 1)}`} className="rounded-xl border border-border px-4 py-2 hover:bg-muted">Próxima →</Link> : <span />}
        </nav>
      )}

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-3">Histórico de movimentações (batismos, ingressos e transferências)</h2>
        <ul className="divide-y divide-border text-sm">
          {movimentos.length === 0 && <li className="py-3 text-muted-foreground">Nenhuma movimentação registrada.</li>}
          {movimentos.map((m) => (
            <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
              <span className="w-24 text-muted-foreground">{formatarDataBr(m.data)}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{ROTULO_MOV[m.tipo] ?? m.tipo}</span>
              <Link href={`/membros/${m.membro_id}`} className="font-medium hover:underline">{m.membro_nome}</Link>
              <span className="text-muted-foreground">{m.descricao}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
