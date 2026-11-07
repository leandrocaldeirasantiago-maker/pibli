import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { exigirParticipanteLouvor } from "@/lib/louvor/acesso";
import { obterFrequencia } from "@/lib/louvor/consultas-extra";
import { faixaDePresenca, percentualPresenca, resumirFrequencia } from "@/lib/louvor/frequencia";
import { listarEventos } from "@/lib/cultos/consultas";
import { dataLonga, formatarHora, somarMeses } from "@/lib/datas";
import { anoMesAtual, lerAnoMes, periodoMes } from "@/lib/financeiro/periodo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ensaios e frequência — Igreja Batista em Largo da Ideia" };

const dois = (n: number) => String(n).padStart(2, "0");
const ROTULO_FAIXA = { sem_dados: "Sem ensaios", alta: "Presença alta", media: "Presença média", baixa: "Presença baixa" } as const;
const COR_FAIXA = {
  sem_dados: "bg-muted text-muted-foreground",
  alta: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  media: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  baixa: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
} as const;
const ROTULO_STATUS = { agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado" } as const;

export default async function PaginaEnsaios({ searchParams: searchParamsPromessa }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await searchParamsPromessa;
  const { perfil } = await exigirParticipanteLouvor();
  const bruto = Array.isArray(searchParams.mes) ? searchParams.mes[0] : searchParams.mes;
  const { ano, mes } = lerAnoMes(bruto) ?? anoMesAtual();
  const periodo = periodoMes(ano, mes);
  const ant = somarMeses(ano, mes, -1);
  const prox = somarMeses(ano, mes, 1);

  const [frequencia, eventos] = await Promise.all([obterFrequencia(periodo.inicio, periodo.fim), listarEventos(periodo.inicio, periodo.fim)]);
  const ensaios = eventos.filter((e) => e.tipo === "ensaio" && e.ministerio_id === perfil.louvorId);
  const resumo = resumirFrequencia(frequencia);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Ensaios e frequência</h1>
          <p className="text-sm capitalize text-muted-foreground">{periodo.rotulo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`?mes=${ant.ano}-${dois(ant.mes)}`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm hover:bg-muted"><ChevronLeft className="h-4 w-4" /> Anterior</Link>
          <Link href={`?mes=${prox.ano}-${dois(prox.mes)}`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm hover:bg-muted">Próximo <ChevronRight className="h-4 w-4" /></Link>
          {perfil.gere && <Link href="/cultos/novo" className="inline-flex h-9 items-center rounded-xl bg-marinho px-3 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900">Novo ensaio</Link>}
        </div>
      </div>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-3">Ensaios do mês</h2>
        <ul className="divide-y divide-border text-sm">
          {ensaios.length === 0 && (
            <li className="py-2 text-muted-foreground">Nenhum ensaio neste mês. Ao criar o evento, escolha o tipo “Ensaio” e o ministério “Louvor”.</li>
          )}
          {ensaios.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <Link href={`/cultos/${e.id}`} className={cn("font-medium hover:underline", e.status === "cancelado" && "line-through")}>{e.titulo}</Link>
                <span className="block text-xs text-muted-foreground">{dataLonga(e.data)} · {formatarHora(e.hora_inicio)}</span>
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{ROTULO_STATUS[e.status]}</span>
            </li>
          ))}
        </ul>
        {perfil.gere && <p className="mt-3 text-xs text-muted-foreground">Para lançar a presença, abra o ensaio e marque “Realizado”; a lista de presença fica na página do evento. Só ensaios realizados entram na frequência.</p>}
      </section>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-1">Frequência</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {perfil.gere ? `${resumo.participantes} participante(s)` : "Sua frequência"} · {resumo.ensaiosNoPeriodo} ensaio(s) realizado(s)
          {resumo.mediaPercentual !== null && ` · média de ${String(resumo.mediaPercentual).replace(".", ",")}%`}.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Participante</th><th className="py-2 pr-3">Presenças</th><th className="py-2">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {frequencia.length === 0 && <tr><td colSpan={3} className="py-3 text-muted-foreground">Nada a mostrar.</td></tr>}
              {frequencia.map((l) => {
                const p = percentualPresenca(l.presentes, l.ensaios);
                const faixa = faixaDePresenca(p);
                return (
                  <tr key={l.membro_id}>
                    <td className="py-2 pr-3">{l.nome}{l.funcao === "lider" && <span className="text-xs text-muted-foreground"> (líder)</span>}</td>
                    <td className="py-2 pr-3">{l.presentes}/{l.ensaios}{p !== null && ` · ${String(p).replace(".", ",")}%`}</td>
                    <td className="py-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", COR_FAIXA[faixa])}>{ROTULO_FAIXA[faixa]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Os números só informam. Ausências têm muitos motivos (trabalho, saúde, família): converse antes de tirar conclusões. {perfil.gere ? "Esta lista é visível apenas à liderança do Louvor; cada músico vê só a própria linha." : ""}</p>
      </section>
    </div>
  );
}
