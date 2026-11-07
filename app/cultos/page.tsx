import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarEventos, listarMinhasEscalas, obterMeuMembroId, type Evento } from "@/lib/cultos/consultas";
import { TIPOS_EVENTO } from "@/lib/cultos/esquema";
import {
  DIAS_CURTOS,
  dataLonga,
  formatarHora,
  gradeDoMes,
  inicioDaSemana,
  lerData,
  somarDias,
  somarMeses,
} from "@/lib/datas";
import { anoMesAtual, hojeBr, lerAnoMes, periodoMes } from "@/lib/financeiro/periodo";
import { cn } from "@/lib/utils";
import { BotoesResposta } from "@/components/cultos/acoes-evento";

export const metadata = { title: "Cultos e eventos — Igreja Batista em Largo da Ideia" };

const dois = (n: number) => String(n).padStart(2, "0");
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function agrupar(eventos: Evento[]) {
  const m = new Map<string, Evento[]>();
  for (const e of eventos) m.set(e.data, [...(m.get(e.data) ?? []), e]);
  return m;
}

function ItemEvento({ e, rotulos, compacto }: { e: Evento; rotulos: Record<string, string>; compacto?: boolean }) {
  const cancelado = e.status === "cancelado";
  return (
    <Link
      href={`/cultos/${e.id}`}
      className={cn(
        "block rounded-lg border border-border bg-background px-2 py-1.5 text-xs transition-colors hover:bg-muted",
        cancelado && "opacity-60",
        !compacto && "px-3 py-2 text-sm",
      )}
    >
      <span className="font-medium">{formatarHora(e.hora_inicio)}</span>{" "}
      <span className={cn(cancelado && "line-through")}>{e.titulo}</span>
      {!compacto && (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {rotulos[e.tipo] ?? e.tipo}
          {e.local ? ` · ${e.local}` : ""}
          {e.ministerio_nome ? ` · ${e.ministerio_nome}` : ""}
          {cancelado ? " · Cancelado" : ""}
          {!e.publico ? " · Interno" : ""}
        </span>
      )}
    </Link>
  );
}

export default async function PaginaCultos({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  const hoje = hojeBr();
  const rotulos = Object.fromEntries(TIPOS_EVENTO);
  const visao = primeiro(searchParams.visao) === "semana" ? "semana" : "mes";
  const podeCriar = !!usuario && ["administrador", "pastor", "secretario", "lider_ministerio"].includes(usuario.papel);

  const meuMembroId = usuario ? await obterMeuMembroId(usuario.id) : null;
  const minhas = meuMembroId
    ? (await listarMinhasEscalas(meuMembroId, hoje)).filter((m) => m.evento_status !== "cancelado").slice(0, 5)
    : [];

  let titulo = "";
  let anterior = "";
  let proximo = "";
  let corpo: React.ReactNode;

  if (visao === "semana") {
    const base = lerData(primeiro(searchParams.data), hoje);
    const inicio = inicioDaSemana(base);
    const fim = somarDias(inicio, 6);
    const eventos = await listarEventos(inicio, fim);
    const porDia = agrupar(eventos);
    titulo = `Semana de ${dataLonga(inicio).split(", ")[1]} a ${dataLonga(fim).split(", ")[1]}`;
    anterior = `?visao=semana&data=${somarDias(inicio, -7)}`;
    proximo = `?visao=semana&data=${somarDias(inicio, 7)}`;
    corpo = (
      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => somarDias(inicio, i)).map((dia) => (
          <section key={dia} className={cn("cartao p-4", dia === hoje && "ring-2 ring-dourado")}>
            <h3 className="mb-2 font-serif text-base font-semibold">{dataLonga(dia)}{dia === hoje && " · hoje"}</h3>
            {(porDia.get(dia) ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos.</p>
            ) : (
              <div className="space-y-2">
                {porDia.get(dia)!.map((e) => <ItemEvento key={e.id} e={e} rotulos={rotulos} />)}
              </div>
            )}
          </section>
        ))}
      </div>
    );
  } else {
    const atual = anoMesAtual();
    const am = lerAnoMes(primeiro(searchParams.mes)) ?? atual;
    const grade = gradeDoMes(am.ano, am.mes);
    const eventos = await listarEventos(grade[0][0], grade[grade.length - 1][6]);
    const porDia = agrupar(eventos);
    const ant = somarMeses(am.ano, am.mes, -1);
    const prox = somarMeses(am.ano, am.mes, 1);
    titulo = periodoMes(am.ano, am.mes).rotulo;
    anterior = `?visao=mes&mes=${ant.ano}-${dois(ant.mes)}`;
    proximo = `?visao=mes&mes=${prox.ano}-${dois(prox.mes)}`;
    const diasComEvento = [...porDia.keys()].filter((d) => d >= `${am.ano}-${dois(am.mes)}-01` && d <= `${am.ano}-${dois(am.mes)}-31`).sort();

    corpo = (
      <>
        <div className="cartao hidden overflow-hidden md:block">
          <div className="grid grid-cols-7 border-b border-border bg-muted text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {DIAS_CURTOS.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          {grade.map((semana, i) => (
            <div key={i} className="grid grid-cols-7 border-b border-border last:border-0">
              {semana.map((dia) => {
                const doMes = Number(dia.slice(5, 7)) === am.mes;
                return (
                  <div key={dia} className={cn("min-h-28 space-y-1 border-r border-border p-1.5 last:border-0", !doMes && "bg-muted text-muted-foreground", dia === hoje && "bg-dourado/10")}>
                    <p className={cn("text-xs font-medium", dia === hoje && "text-dourado-600")}>{Number(dia.slice(8))}</p>
                    {(porDia.get(dia) ?? []).map((e) => <ItemEvento key={e.id} e={e} rotulos={rotulos} compacto />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="space-y-3 md:hidden">
          {diasComEvento.length === 0 && <p className="cartao p-4 text-sm text-muted-foreground">Nenhum evento neste mês.</p>}
          {diasComEvento.map((dia) => (
            <section key={dia} className={cn("cartao p-4", dia === hoje && "ring-2 ring-dourado")}>
              <h3 className="mb-2 font-serif text-base font-semibold">{dataLonga(dia)}</h3>
              <div className="space-y-2">{porDia.get(dia)!.map((e) => <ItemEvento key={e.id} e={e} rotulos={rotulos} />)}</div>
            </section>
          ))}
        </div>
      </>
    );
  }

  const aba = (ativa: boolean) =>
    cn("inline-flex h-9 items-center rounded-xl border px-3 text-sm", ativa ? "border-dourado bg-dourado text-marinho-900" : "border-border hover:bg-muted");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Cultos e eventos</h1>
          <p className="text-sm capitalize text-muted-foreground">{titulo}</p>
        </div>
        {podeCriar && (
          <Link href="/cultos/novo" className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900">
            <CalendarPlus className="h-4 w-4" /> Novo evento
          </Link>
        )}
      </div>

      {minhas.length > 0 && (
        <section className="cartao p-5" aria-label="Minhas escalas">
          <h2 className="titulo-secao mb-3">Minhas próximas escalas</h2>
          <ul className="divide-y divide-border text-sm">
            {minhas.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <Link href={`/cultos/${m.evento_id}`} className="font-medium hover:underline">{m.titulo}</Link>
                  <span className="text-muted-foreground"> · {m.funcao} · {dataLonga(m.data)}, {formatarHora(m.hora_inicio)}</span>
                </span>
                <BotoesResposta escalaId={m.id} status={m.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href="?visao=mes" className={aba(visao === "mes")}>Mês</Link>
        <Link href="?visao=semana" className={aba(visao === "semana")}>Semana</Link>
        <span className="mx-1 h-6 w-px bg-border" />
        <Link href={anterior} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm hover:bg-muted"><ChevronLeft className="h-4 w-4" /> Anterior</Link>
        <Link href={proximo} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm hover:bg-muted">Próximo <ChevronRight className="h-4 w-4" /></Link>
        <Link href={`?visao=${visao}`} className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm hover:bg-muted">Hoje</Link>
        <span className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex"><Lock className="h-3 w-3" /> Eventos internos só aparecem para a liderança e escalados</span>
      </div>

      {corpo}
    </div>
  );
}
