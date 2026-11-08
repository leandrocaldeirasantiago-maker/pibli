import {
  Users,
  UserPlus,
  Cake,
  DoorOpen,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CalendarClock,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { CartaoIndicador } from "@/components/painel/cartao-indicador";
import { GraficoCrescimento, GraficoFinanceiro } from "@/components/painel/graficos";
import { listarAvisos } from "@/lib/comunicacao/consultas";
import { listarEventos, type Evento } from "@/lib/cultos/consultas";
import { formatarHora, somarDias } from "@/lib/datas";
import { obterFluxoMeses, obterResumo, obterSaldoAte } from "@/lib/financeiro/consultas";
import { anoMesAtual, hojeBr, periodoMes } from "@/lib/financeiro/periodo";
import { formatarMoeda } from "@/lib/utils";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { podeAcessarModulo, type Papel } from "@/lib/permissoes";

const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const VEEM_MEMBROS: Papel[] = ["administrador", "pastor", "secretario", "lider_ministerio"];
const VEEM_FINANCAS: Papel[] = ["administrador", "pastor", "tesoureiro"];

type Resumo = {
  membros_ativos: number;
  novos_membros: number;
  aniversariantes_mes: number;
  visitantes_mes: number;
};

export default async function PaginaPainel({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  const papel = usuario?.papel;
  const veMembros = !!papel && VEEM_MEMBROS.includes(papel);
  const veFinancas = !!papel && VEEM_FINANCAS.includes(papel);
  const veVisitantes = !!papel && ["administrador", "pastor", "secretario"].includes(papel);

  let dados: Resumo | null = null;
  let aniversariantes: { id: string; nome_completo: string; dia: number }[] = [];
  let crescimento: { mes: string; membros: number }[] = [];

  if (veMembros) {
    const supabase = criarClienteServidor();
    const [r, a, c] = await Promise.all([
      supabase.rpc("resumo_painel"),
      supabase.rpc("aniversariantes_mes"),
      supabase.rpc("crescimento_membros"),
    ]);
    dados = (r.data as Resumo | null) ?? null;
    aniversariantes = (a.data ?? []) as typeof aniversariantes;
    crescimento = ((c.data ?? []) as { mes: string; total: number }[]).map((x) => ({
      mes: MESES[Number(x.mes.slice(5, 7)) - 1],
      membros: Number(x.total),
    }));
  }

  const mesAtual = MESES[new Date().getMonth()];
  let fin = { receitas: 0, despesas: 0 };
  let saldo = 0;
  let fluxoGrafico: { mes: string; receitas: number; despesas: number }[] = [];
  if (veFinancas) {
    const { ano, mes } = anoMesAtual();
    const [r, s, f] = await Promise.all([
      obterResumo(periodoMes(ano, mes)),
      obterSaldoAte(hojeBr()),
      obterFluxoMeses(6),
    ]);
    fin = { receitas: r.receitas, despesas: r.despesas };
    saldo = s;
    fluxoGrafico = f.map((x) => ({
      mes: MESES[Number(x.mes.slice(5, 7)) - 1],
      receitas: x.receitas,
      despesas: x.despesas,
    }));
  }
  // Próximos eventos reais (o RLS já limita o que cada papel enxerga).
  const hoje = hojeBr();
  const proximos = ((await listarEventos(hoje, somarDias(hoje, 14)).catch(() => [])) as Evento[])
    .filter((e) => e.status === "agendado")
    .slice(0, 5);
  const avisosRecentes = (await listarAvisos(10).catch(() => []))
    .filter((a) => a.status === "publicado" && a.publicar_em <= hoje && (!a.expira_em || a.expira_em >= hoje))
    .slice(0, 4);
  const semPermissao = searchParams.aviso === "sem-permissao";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">
          Paz do Senhor{usuario ? `, ${usuario.nome.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground">Veja o resumo da vida da igreja neste mês.</p>
        {semPermissao && (
          <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Você não tem permissão para acessar essa área.
          </p>
        )}
      </section>

      {veMembros && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de membros">
          <CartaoIndicador
            titulo="Membros ativos"
            valor={String(dados?.membros_ativos ?? 0)}
            icone={Users}
          />
          <CartaoIndicador
            titulo={`Novos membros (${mesAtual})`}
            valor={`+${dados?.novos_membros ?? 0}`}
            icone={UserPlus}
          />
          <CartaoIndicador
            titulo="Aniversariantes do mês"
            valor={String(dados?.aniversariantes_mes ?? 0)}
            icone={Cake}
          />
          {veVisitantes && (
            <CartaoIndicador
              titulo={`Visitantes (${mesAtual})`}
              valor={String(dados?.visitantes_mes ?? 0)}
              icone={DoorOpen}
            />
          )}
        </section>
      )}

      {veFinancas && (
        <section aria-label="Indicadores financeiros">
          <p className="mb-2 inline-block rounded-full bg-dourado-100 px-3 py-1 text-xs text-marinho-800 dark:bg-dourado/20 dark:text-dourado-100">
            Totais de {mesAtual} — dados reais do módulo financeiro. O saldo soma todas as contas até hoje.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <CartaoIndicador titulo="Receitas" valor={formatarMoeda(fin.receitas)} icone={TrendingUp} />
            <CartaoIndicador titulo="Despesas" valor={formatarMoeda(fin.despesas)} icone={TrendingDown} />
            <CartaoIndicador
              titulo="Saldo financeiro"
              valor={formatarMoeda(saldo)}
              icone={PiggyBank}
              destaque={saldo >= 0 ? "positivo" : "negativo"}
            />
          </div>
        </section>
      )}

      {(veMembros || veFinancas) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {veMembros && (
            <div className="cartao p-5">
              <h2 className="titulo-secao mb-4">Crescimento de membros (6 meses)</h2>
              {crescimento.length > 0 ? (
                <GraficoCrescimento dados={crescimento} />
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
              )}
            </div>
          )}
          {veFinancas && (
            <div className="cartao p-5">
              <h2 className="titulo-secao mb-4">Receitas e despesas (6 meses)</h2>
              <GraficoFinanceiro dados={fluxoGrafico} />
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="cartao p-5">
          <h2 className="titulo-secao mb-1 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-dourado" /> Próximos cultos
          </h2>
          {proximos.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Nenhum evento agendado nos próximos 14 dias.</p>
          ) : (
            <ul className="divide-y divide-border">
              {proximos.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <Link href={`/cultos/${e.id}`} className="font-medium hover:underline">{e.titulo}</Link>
                  <span className="shrink-0 text-muted-foreground">
                    {dataCurta(e.data)} · {formatarHora(e.hora_inicio)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/cultos" className="mt-2 inline-block text-xs underline">Ver agenda completa</Link>
        </div>

        <div className="cartao p-5">
          <h2 className="titulo-secao mb-1 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-dourado" /> Últimos avisos
          </h2>
          {avisosRecentes.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Nenhum aviso no momento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {avisosRecentes.map((a) => (
                <li key={a.id} className="py-3 text-sm">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{dataCurta(a.publicar_em)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/comunicacao" className="mt-2 inline-block text-xs underline">Ver mural completo</Link>
        </div>

        {veMembros && (
          <div className="cartao p-5">
            <h2 className="titulo-secao mb-3 flex items-center gap-2">
              <Cake className="h-5 w-5 text-dourado" /> Aniversariantes de {mesAtual}
            </h2>
            {aniversariantes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aniversariante neste mês.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-border overflow-y-auto">
                {aniversariantes.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                    {papel && podeAcessarModulo(papel, "membros") ? (
                      <Link href={`/membros/${p.id}`} className="font-medium hover:underline">
                        {p.nome_completo}
                      </Link>
                    ) : (
                      <span className="font-medium">{p.nome_completo}</span>
                    )}
                    <span className="text-muted-foreground">dia {p.dia}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
