import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart,
  Lock,
  PiggyBank,
  Plus,
  Settings2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import {
  TAMANHO_PAGINA_LANC,
  lerFiltrosLancamentos,
  listarCategorias,
  listarContas,
  listarFechamentos,
  listarLancamentos,
  obterFluxoMeses,
  obterResumo,
  obterSaldoContas,
} from "@/lib/financeiro/consultas";
import { MESES_CURTOS, deslocarPeriodo, lerPeriodo } from "@/lib/financeiro/periodo";
import { FORMAS_PAGAMENTO } from "@/lib/financeiro/esquema";
import { formatarDataBr } from "@/lib/membros/esquema";
import { formatarMoeda, cn } from "@/lib/utils";
import { CartaoIndicador } from "@/components/painel/cartao-indicador";
import { GraficoFinanceiro } from "@/components/painel/graficos";
import { BotaoCancelarLancamento } from "@/components/financeiro/acoes-lancamento";

export const metadata = { title: "Financeiro — Igreja Batista em Largo da Ideia" };

export default async function PaginaFinanceiro({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  const escrita = usuario?.papel === "administrador" || usuario?.papel === "tesoureiro";

  const filtros = lerFiltrosLancamentos(searchParams);
  const periodo = lerPeriodo(filtros.periodo);
  const formas = Object.fromEntries(FORMAS_PAGAMENTO);

  const [resumo, contasSaldo, fluxo, fechados] = await Promise.all([
    obterResumo(periodo),
    obterSaldoContas(),
    obterFluxoMeses(12),
    listarFechamentos(),
  ]);
  const saldoTotal = contasSaldo.reduce((s, c) => s + c.saldo, 0);
  const fechado = periodo.tipo === "mes" && fechados.includes(periodo.valor);

  const lista = escrita
    ? await Promise.all([
        listarLancamentos(filtros, periodo, (filtros.pagina - 1) * TAMANHO_PAGINA_LANC, TAMANHO_PAGINA_LANC),
        listarCategorias(),
        listarContas(),
      ])
    : null;
  const linhas = lista?.[0].linhas ?? [];
  const total = lista?.[0].total ?? 0;
  const categorias = lista?.[1] ?? [];
  const contas = lista?.[2] ?? [];
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA_LANC));

  const consulta = (sobrescrever: { periodo?: string; pagina?: number } = {}) => {
    const p = new URLSearchParams();
    p.set("periodo", sobrescrever.periodo ?? periodo.valor);
    if (filtros.tipo) p.set("tipo", filtros.tipo);
    if (filtros.categoria) p.set("categoria", filtros.categoria);
    if (filtros.conta) p.set("conta", filtros.conta);
    if (filtros.q) p.set("q", filtros.q);
    if (filtros.cancelados) p.set("cancelados", "1");
    if (sobrescrever.pagina && sobrescrever.pagina > 1) p.set("pagina", String(sobrescrever.pagina));
    return `?${p.toString()}`;
  };

  const anterior = deslocarPeriodo(periodo, -1);
  const proximo = deslocarPeriodo(periodo, 1);
  const dadosGrafico = fluxo.map((f) => ({
    mes: MESES_CURTOS[Number(f.mes.slice(5, 7)) - 1],
    receitas: f.receitas,
    despesas: f.despesas,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Financeiro</h1>
          <p className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
            {periodo.rotulo}
            {fechado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs normal-case">
                <Lock className="h-3 w-3" /> mês fechado
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/financeiro/relatorios?periodo=${periodo.valor}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
            <FileBarChart className="h-4 w-4" /> Relatórios
          </Link>
          {escrita && (
            <Link href="/financeiro/exportacao-contabil" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
              <FileBarChart className="h-4 w-4" /> Exportação contábil
            </Link>
          )}
          <Link href="/financeiro/contas" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
            <Settings2 className="h-4 w-4" /> Contas e categorias
          </Link>
          {escrita && (
            <>
              <a href={`/financeiro/exportar${consulta()}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
                <Download className="h-4 w-4" /> Exportar CSV
              </a>
              <Link href="/financeiro/novo" className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900">
                <Plus className="h-4 w-4" /> Novo lançamento
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={consulta({ periodo: anterior.valor })} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 hover:bg-muted">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Link>
        <Link href={consulta({ periodo: proximo.valor })} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 hover:bg-muted">
          Próximo <ChevronRight className="h-4 w-4" />
        </Link>
        <Link href={`/financeiro?periodo=${periodo.ano}`} className="inline-flex h-9 items-center rounded-xl border border-border px-3 hover:bg-muted">
          Ano inteiro
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Totais do período">
        <CartaoIndicador titulo="Receitas do período" valor={formatarMoeda(resumo.receitas)} icone={TrendingUp} />
        <CartaoIndicador titulo="Despesas do período" valor={formatarMoeda(resumo.despesas)} icone={TrendingDown} />
        <CartaoIndicador
          titulo="Resultado do período"
          valor={formatarMoeda(resumo.saldoPeriodo)}
          icone={PiggyBank}
          destaque={resumo.saldoPeriodo >= 0 ? "positivo" : "negativo"}
        />
        <CartaoIndicador titulo="Saldo atual (todas as contas)" valor={formatarMoeda(saldoTotal)} icone={PiggyBank} destaque={saldoTotal >= 0 ? "positivo" : "negativo"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="cartao p-5">
          <h2 className="titulo-secao mb-4">Receitas e despesas — últimos 12 meses</h2>
          <GraficoFinanceiro dados={dadosGrafico} />
        </div>
        <div className="cartao p-5">
          <h2 className="titulo-secao mb-3">Saldo por conta</h2>
          <ul className="divide-y divide-border text-sm">
            {contasSaldo.map((c) => (
              <li key={c.conta_id} className="flex items-center justify-between py-2.5">
                <span className={cn(!c.ativa && "text-muted-foreground")}>
                  {c.nome}
                  {!c.ativa && " (inativa)"}
                </span>
                <span className={cn("font-medium", c.saldo < 0 && "text-red-600")}>{formatarMoeda(c.saldo)}</span>
              </li>
            ))}
            {contasSaldo.length === 0 && <li className="py-2.5 text-muted-foreground">Nenhuma conta cadastrada.</li>}
          </ul>
        </div>
      </section>

      {!escrita && (
        <p className="cartao p-5 text-sm text-muted-foreground">
          Seu perfil acompanha apenas os totais. A lista de lançamentos é restrita à tesouraria e ao administrador.
        </p>
      )}

      {escrita && (
        <>
          <form method="get" className="cartao grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
            <input type="month" name="periodo" aria-label="Mês" defaultValue={periodo.tipo === "mes" ? periodo.valor : ""} className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
            <select name="tipo" aria-label="Tipo" defaultValue={filtros.tipo} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Receitas e despesas</option>
              <option value="receita">Só receitas</option>
              <option value="despesa">Só despesas</option>
            </select>
            <select name="categoria" aria-label="Categoria" defaultValue={filtros.categoria} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <select name="conta" aria-label="Conta" defaultValue={filtros.conta} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Todas as contas</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <input type="search" name="q" aria-label="Buscar" placeholder="Descrição ou membro…" defaultValue={filtros.q} className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="cancelados" value="1" defaultChecked={filtros.cancelados} /> Cancelados
              </label>
              <button type="submit" className="h-10 rounded-xl bg-marinho px-4 text-sm font-medium text-white dark:bg-dourado dark:text-marinho-900">
                Filtrar
              </button>
            </div>
          </form>

          <div className="cartao overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Categoria / descrição</th>
                  <th className="px-4 py-3 font-medium">Conta / forma</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum lançamento encontrado neste período.
                    </td>
                  </tr>
                )}
                {linhas.map((l) => (
                  <tr key={l.id} className={cn(l.cancelado && "text-muted-foreground")}>
                    <td className="px-4 py-3">{formatarDataBr(l.data)}</td>
                    <td className="px-4 py-3">
                      <p className={cn("font-medium", l.cancelado && "line-through")}>{l.categoria}</p>
                      <p className="text-xs text-muted-foreground">
                        {[l.descricao, l.membro_nome].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {l.cancelado && <p className="text-xs text-red-600">Cancelado: {l.motivo}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p>{l.conta}</p>
                      <p className="text-xs text-muted-foreground">{formas[l.forma] ?? l.forma}</p>
                    </td>
                    <td className={cn("whitespace-nowrap px-4 py-3 text-right font-medium", l.cancelado && "line-through", !l.cancelado && (l.tipo === "receita" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"))}>
                      {l.tipo === "receita" ? "+" : "−"} {formatarMoeda(l.valor)}
                    </td>
                    <td className="px-4 py-3">
                      {!l.cancelado && (
                        <span className="flex items-center gap-3">
                          <Link href={`/financeiro/${l.id}/editar`} className="text-sm underline">Editar</Link>
                          <BotaoCancelarLancamento id={l.id} descricao={l.categoria} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="Paginação">
              {filtros.pagina > 1 ? (
                <Link href={`/financeiro${consulta({ pagina: filtros.pagina - 1 })}`} className="rounded-xl border border-border px-4 py-2 hover:bg-muted">← Anterior</Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">Página {filtros.pagina} de {totalPaginas}</span>
              {filtros.pagina < totalPaginas ? (
                <Link href={`/financeiro${consulta({ pagina: filtros.pagina + 1 })}`} className="rounded-xl border border-border px-4 py-2 hover:bg-muted">Próxima →</Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
