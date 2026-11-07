import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { obterRelatorioPresenca } from "@/lib/cultos/presenca";
import { resumirPresenca } from "@/lib/cultos/presenca-resumo";
import { TIPOS_EVENTO } from "@/lib/cultos/esquema";
import { listarResumoMinisterios } from "@/lib/ministerios/consultas";
import { obterResumo } from "@/lib/financeiro/consultas";
import { anoMesAtual, lerAnoMes, periodoMes } from "@/lib/financeiro/periodo";
import { somarMeses } from "@/lib/datas";
import { formatarDataBr } from "@/lib/membros/esquema";
import { formatarMoeda } from "@/lib/utils";

export const metadata = { title: "Relatórios — Igreja Batista em Largo da Ideia" };

const dois = (n: number) => String(n).padStart(2, "0");

export default async function PaginaRelatorios({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null;
  const papel = usuario.papel;
  const veGestao = ["administrador", "pastor", "secretario"].includes(papel);
  const veFinancas = ["administrador", "pastor", "tesoureiro"].includes(papel);

  const bruto = Array.isArray(searchParams.mes) ? searchParams.mes[0] : searchParams.mes;
  const { ano, mes } = lerAnoMes(bruto) ?? anoMesAtual();
  const periodo = periodoMes(ano, mes);
  const ant = somarMeses(ano, mes, -1);
  const prox = somarMeses(ano, mes, 1);
  const rotuloTipo = Object.fromEntries(TIPOS_EVENTO);

  const [presenca, ministerios, fin] = await Promise.all([
    veGestao ? obterRelatorioPresenca(periodo.inicio, periodo.fim) : Promise.resolve([]),
    veGestao ? listarResumoMinisterios() : Promise.resolve([]),
    veFinancas ? obterResumo(periodo) : Promise.resolve(null),
  ]);
  const resumo = resumirPresenca(presenca);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Relatórios</h1>
          <p className="text-sm capitalize text-muted-foreground">{periodo.rotulo}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`?mes=${ant.ano}-${dois(ant.mes)}`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm hover:bg-muted"><ChevronLeft className="h-4 w-4" /> Anterior</Link>
          <Link href={`?mes=${prox.ano}-${dois(prox.mes)}`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm hover:bg-muted">Próximo <ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Atalhos">
        {veGestao && <Link href="/secretaria/relatorio" className="cartao p-4 text-sm hover:bg-muted"><strong>Membros</strong><span className="block text-muted-foreground">Situação, faixa etária, estado civil e ministérios.</span></Link>}
        {veFinancas && <Link href="/financeiro/relatorios" className="cartao p-4 text-sm hover:bg-muted"><strong>Financeiro</strong><span className="block text-muted-foreground">Demonstrativo mensal e anual, por categoria.</span></Link>}
        {veGestao && <Link href="/cultos" className="cartao p-4 text-sm hover:bg-muted"><strong>Agenda de cultos</strong><span className="block text-muted-foreground">Lançar presença em cada evento.</span></Link>}
      </section>

      {veFinancas && fin && (
        <section className="cartao p-5">
          <h2 className="titulo-secao mb-3">Finanças do mês (totais)</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Receitas</dt><dd className="text-lg font-semibold">{formatarMoeda(fin.receitas)}</dd></div>
            <div><dt className="text-muted-foreground">Despesas</dt><dd className="text-lg font-semibold">{formatarMoeda(fin.despesas)}</dd></div>
            <div><dt className="text-muted-foreground">Resultado do mês</dt><dd className="text-lg font-semibold">{formatarMoeda(fin.saldoPeriodo)}</dd></div>
          </dl>
        </section>
      )}

      {veGestao && (
        <>
          <section className="cartao p-5">
            <h2 className="titulo-secao mb-1">Presença nos eventos</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              {resumo.eventosRealizados} evento(s) realizado(s) · {resumo.totalPresencas} presença(s) · média de {String(resumo.media).replace(".", ",")} por evento.
              Só eventos marcados como realizados entram na média.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Data</th><th className="py-2 pr-3">Evento</th><th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3">Situação</th><th className="py-2 text-right">Presentes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {presenca.length === 0 && <tr><td colSpan={5} className="py-3 text-muted-foreground">Nenhum evento neste mês.</td></tr>}
                  {presenca.map((l) => (
                    <tr key={l.evento_id}>
                      <td className="whitespace-nowrap py-2 pr-3">{formatarDataBr(l.data)}</td>
                      <td className="py-2 pr-3"><Link href={`/cultos/${l.evento_id}`} className="hover:underline">{l.titulo}</Link></td>
                      <td className="py-2 pr-3">{rotuloTipo[l.tipo] ?? l.tipo}</td>
                      <td className="py-2 pr-3 capitalize">{l.status}</td>
                      <td className="py-2 text-right">{l.status === "cancelado" ? "—" : l.presentes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="cartao p-5">
            <h2 className="titulo-secao mb-3">Ministérios</h2>
            <ul className="divide-y divide-border text-sm">
              {ministerios.length === 0 && <li className="py-2 text-muted-foreground">Nenhum ministério.</li>}
              {ministerios.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link href={`/ministerios/${m.id}`} className="font-medium hover:underline">{m.nome}{!m.ativo && " (inativo)"}</Link>
                  <span className="text-muted-foreground">{m.total} participante(s){m.lideres ? ` · Líder: ${m.lideres}` : " · sem líder"}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
