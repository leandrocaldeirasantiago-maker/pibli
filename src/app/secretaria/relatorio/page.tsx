import Link from "next/link";
import { Download } from "lucide-react";
import { obterRelatorioMembros } from "@/lib/secretaria/consultas";
import { IGREJA_NOME } from "@/lib/secretaria/modelos";
import { dataPorExtenso } from "@/lib/datas";
import { hojeBr } from "@/lib/financeiro/periodo";
import { BotaoImprimir } from "@/components/financeiro/acoes-lancamento";

export const metadata = { title: "Relatório de membros — Igreja Batista em Largo da Ideia" };

const SITUACAO: Record<string, string> = { ativo: "Ativos", inativo: "Inativos", transferido: "Transferidos", falecido: "Falecidos" };
const ESTADO_CIVIL: Record<string, string> = {
  solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)",
  uniao_estavel: "União estável", nao_informado: "Não informado",
};
const FAIXA: [string, string][] = [
  ["0_12", "0 a 12 anos"], ["13_17", "13 a 17 anos"], ["18_29", "18 a 29 anos"],
  ["30_44", "30 a 44 anos"], ["45_59", "45 a 59 anos"], ["60_mais", "60 anos ou mais"], ["sem_data", "Sem data de nascimento"],
];

function Tabela({ titulo, linhas, total }: { titulo: string; linhas: [string, number][]; total: number }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="titulo-secao mb-2">{titulo}</h3>
      <ul className="divide-y divide-border text-sm">
        {linhas.length === 0 && <li className="py-2 text-muted-foreground">Sem dados.</li>}
        {linhas.map(([rotulo, n]) => (
          <li key={rotulo} className="flex items-center justify-between gap-3 py-2">
            <span>{rotulo}</span>
            <span className="tabular-nums">
              {n}
              {total > 0 && <span className="ml-2 text-xs text-muted-foreground">({Math.round((n / total) * 100)}%)</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PaginaRelatorioMembros() {
  const r = await obterRelatorioMembros();
  const ativos = r.por_situacao.ativo ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Relatório de membros</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/secretaria" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar</Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- download (route handler), não é uma página */}
          <a href="/membros/exportar" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
            <Download className="h-4 w-4" /> Lista completa (CSV)
          </a>
          <BotaoImprimir />
        </div>
      </div>

      <article className="cartao space-y-6 p-6 print:border-0 print:shadow-none">
        <header>
          <p className="font-serif text-sm font-semibold text-dourado-600">{IGREJA_NOME}</p>
          <h2 className="font-serif text-xl font-semibold">Relatório de membros</h2>
          <p className="text-xs text-muted-foreground">Posição em {dataPorExtenso(hojeBr())}. Total de cadastros: {r.total}. Percentuais de situação sobre o total; demais quadros sobre os {ativos} membros ativos.</p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <Tabela
            titulo="Por situação"
            total={r.total}
            linhas={Object.entries(SITUACAO).map(([k, rot]) => [rot, r.por_situacao[k] ?? 0] as [string, number])}
          />
          <Tabela
            titulo="Estado civil (ativos)"
            total={ativos}
            linhas={Object.entries(ESTADO_CIVIL).filter(([k]) => (r.por_estado_civil[k] ?? 0) > 0).map(([k, rot]) => [rot, r.por_estado_civil[k]] as [string, number])}
          />
          <Tabela
            titulo="Faixa etária (ativos)"
            total={ativos}
            linhas={FAIXA.filter(([k]) => (r.por_faixa_etaria[k] ?? 0) > 0).map(([k, rot]) => [rot, r.por_faixa_etaria[k]] as [string, number])}
          />
          <Tabela
            titulo="Batismo (ativos)"
            total={ativos}
            linhas={[["Batizados", r.batizados], ["Sem data de batismo", r.sem_batismo]]}
          />
          <Tabela
            titulo="Participantes por ministério (ativos)"
            total={ativos}
            linhas={r.por_ministerio.map((m) => [m.nome, m.total] as [string, number])}
          />
          <Tabela
            titulo="Ingressos por ano (últimos 6 anos)"
            total={0}
            linhas={Object.entries(r.ingressos_por_ano).sort(([a], [b]) => b.localeCompare(a)).map(([ano, n]) => [ano, n] as [string, number])}
          />
        </div>
      </article>
    </div>
  );
}
