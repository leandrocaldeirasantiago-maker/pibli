import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarCategorias, listarContas, listarFechamentos } from "@/lib/financeiro/consultas";
import { GRUPOS_RECEITA, TIPOS_CONTA } from "@/lib/financeiro/esquema";
import { formatarMoeda, cn } from "@/lib/utils";
import {
  BotaoAlternarCategoria,
  BotaoAlternarConta,
  BotaoReabrirMes,
  FormFecharMes,
  FormNovaCategoria,
  FormNovaConta,
} from "@/components/financeiro/gestao";

export const metadata = { title: "Contas e categorias — Igreja Batista em Largo da Ideia" };

export default async function PaginaContasCategorias() {
  const usuario = await obterUsuarioAtual();
  const escrita = usuario?.papel === "administrador" || usuario?.papel === "tesoureiro";
  const admin = usuario?.papel === "administrador";

  const [contas, categorias, fechados] = await Promise.all([
    listarContas(),
    listarCategorias(),
    listarFechamentos(),
  ]);
  const tiposConta = Object.fromEntries(TIPOS_CONTA);
  const grupos = Object.fromEntries(GRUPOS_RECEITA);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Contas, categorias e fechamento</h1>
        <Link href="/financeiro" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">
          Voltar
        </Link>
      </div>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-3">Contas e caixas</h2>
        <ul className="divide-y divide-border text-sm">
          {contas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className={cn(!c.ativa && "text-muted-foreground")}>
                <span className="font-medium">{c.nome}</span> · {tiposConta[c.tipo]} · saldo inicial {formatarMoeda(c.saldo_inicial)}
                {!c.ativa && " · inativa"}
              </span>
              {escrita && <BotaoAlternarConta conta={c} />}
            </li>
          ))}
        </ul>
        {escrita && (
          <div className="mt-4 border-t border-border pt-4">
            <FormNovaConta />
            <p className="mt-2 text-xs text-muted-foreground">O saldo inicial de uma conta existente não pode ser alterado, para preservar o histórico.</p>
          </div>
        )}
      </section>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-3">Categorias financeiras</h2>
        <ul className="divide-y divide-border text-sm">
          {categorias.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className={cn(!c.ativa && "text-muted-foreground")}>
                <span className="font-medium">{c.nome}</span> · {c.tipo === "receita" ? `Receita (${grupos[c.grupo ?? ""] ?? "—"})` : "Despesa"}
                {!c.ativa && " · inativa"}
              </span>
              {escrita && <BotaoAlternarCategoria categoria={c} />}
            </li>
          ))}
        </ul>
        {escrita && (
          <div className="mt-4 border-t border-border pt-4">
            <FormNovaCategoria />
            <p className="mt-2 text-xs text-muted-foreground">Categorias não são apagadas, apenas desativadas; tipo e grupo não mudam depois de criadas.</p>
          </div>
        )}
      </section>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-1">Fechamento de mês</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Meses fechados não aceitam novos lançamentos, edições nem cancelamentos. Só o administrador reabre.
        </p>
        {escrita && <FormFecharMes />}
        <ul className="mt-4 divide-y divide-border text-sm">
          {fechados.length === 0 && <li className="py-2.5 text-muted-foreground">Nenhum mês fechado.</li>}
          {fechados.map((m) => (
            <li key={m} className="flex items-center justify-between py-2.5">
              <span>{m.slice(5)}/{m.slice(0, 4)}</span>
              {admin && <BotaoReabrirMes mes={m} />}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
