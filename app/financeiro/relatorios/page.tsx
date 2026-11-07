import Link from "next/link";
import { Download } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { montarRelatorio } from "@/lib/financeiro/consultas";
import { GRUPOS_RECEITA } from "@/lib/financeiro/esquema";
import { MESES_CURTOS, lerPeriodo } from "@/lib/financeiro/periodo";
import { formatarMoeda, cn } from "@/lib/utils";
import { GraficoFinanceiro } from "@/components/painel/graficos";
import { BotaoImprimir } from "@/components/financeiro/acoes-lancamento";

export const metadata = { title: "Relatórios financeiros — Igreja Batista em Largo da Ideia" };

export default async function PaginaRelatorios({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  const escrita = usuario?.papel === "administrador" || usuario?.papel === "tesoureiro";
  const bruto = Array.isArray(searchParams.periodo) ? searchParams.periodo[0] : searchParams.periodo;
  const periodo = lerPeriodo(bruto);
  const r = await montarRelatorio(periodo);
  const grupos = Object.fromEntries(GRUPOS_RECEITA);

  const receitas = r.porCategoria.filter((c) => c.tipo === "receita");
  const despesas = r.porCategoria.filter((c) => c.tipo === "despesa");
  const porMes = r.porMes?.map((m) => ({ mes: MESES_CURTOS[m.mes - 1], receitas: m.receitas, despesas: m.despesas }));

  const linha = "flex items-center justify-between py-2 text-sm";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Relatórios financeiros</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/financeiro" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar</Link>
          {escrita && (
            <a href={`/financeiro/exportar?periodo=${periodo.valor}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
              <Download className="h-4 w-4" /> Exportar CSV (Excel)
            </a>
          )}
          <BotaoImprimir />
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3 print:hidden">
        <input type="month" name="periodo" aria-label="Mês" defaultValue={periodo.tipo === "mes" ? periodo.valor : ""} className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <button type="submit" className="h-10 rounded-xl bg-marinho px-4 text-sm font-medium text-white dark:bg-dourado dark:text-marinho-900">Ver mês</button>
        <Link href={`/financeiro/relatorios?periodo=${periodo.ano}`} className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">
          Ver ano de {periodo.ano}
        </Link>
      </form>

      <article className="cartao space-y-5 p-6 print:border-0 print:shadow-none">
        <header>
          <p className="font-serif text-sm font-semibold text-dourado-600">Igreja Batista em Largo da Ideia</p>
          <h2 className="font-serif text-xl font-semibold capitalize">Demonstrativo financeiro — {periodo.rotulo}</h2>
          <p className="text-xs text-muted-foreground">Não inclui lançamentos cancelados.</p>
        </header>

        <section>
          <div className={cn(linha, "font-medium")}>
            <span>Saldo anterior (todas as contas)</span>
            <span>{formatarMoeda(r.saldoAnterior)}</span>
          </div>
        </section>

        <section>
          <h3 className="titulo-secao mb-1">Receitas</h3>
          <ul className="divide-y divide-border">
            {receitas.length === 0 && <li className={cn(linha, "text-muted-foreground")}>Nenhuma receita no período.</li>}
            {receitas.map((c) => (
              <li key={c.categoria_id} className={linha}>
                <span>{c.categoria} <span className="text-xs text-muted-foreground">({grupos[c.grupo ?? ""] ?? "—"})</span></span>
                <span>{formatarMoeda(c.total)}</span>
              </li>
            ))}
            <li className={cn(linha, "font-semibold")}><span>Total de receitas</span><span>{formatarMoeda(r.receitas)}</span></li>
          </ul>
        </section>

        <section>
          <h3 className="titulo-secao mb-1">Despesas</h3>
          <ul className="divide-y divide-border">
            {despesas.length === 0 && <li className={cn(linha, "text-muted-foreground")}>Nenhuma despesa no período.</li>}
            {despesas.map((c) => (
              <li key={c.categoria_id} className={linha}><span>{c.categoria}</span><span>{formatarMoeda(c.total)}</span></li>
            ))}
            <li className={cn(linha, "font-semibold")}><span>Total de despesas</span><span>{formatarMoeda(r.despesas)}</span></li>
          </ul>
        </section>

        <section className="space-y-1 border-t border-border pt-3">
          <div className={cn(linha, "font-semibold")}>
            <span>Resultado do período (receitas − despesas)</span>
            <span className={r.resultado < 0 ? "text-red-600" : ""}>{formatarMoeda(r.resultado)}</span>
          </div>
          <div className={cn(linha, "text-base font-semibold")}>
            <span>Saldo final</span>
            <span className={r.saldoFinal < 0 ? "text-red-600" : ""}>{formatarMoeda(r.saldoFinal)}</span>
          </div>
        </section>

        {porMes && (
          <section>
            <h3 className="titulo-secao mb-2">Mês a mês</h3>
            <div className="print:hidden"><GraficoFinanceiro dados={porMes} /></div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 font-medium">Mês</th>
                  <th className="py-2 text-right font-medium">Receitas</th>
                  <th className="py-2 text-right font-medium">Despesas</th>
                  <th className="py-2 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.porMes!.map((m) => (
                  <tr key={m.mes}>
                    <td className="py-2">{MESES_CURTOS[m.mes - 1]}</td>
                    <td className="py-2 text-right">{formatarMoeda(m.receitas)}</td>
                    <td className="py-2 text-right">{formatarMoeda(m.despesas)}</td>
                    <td className={cn("py-2 text-right", m.receitas - m.despesas < 0 && "text-red-600")}>{formatarMoeda(m.receitas - m.despesas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </article>
    </div>
  );
}
