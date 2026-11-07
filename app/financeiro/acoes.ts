"use server";

import { revalidatePath } from "next/cache";
import { obterUsuarioAtual, criarClienteServidor } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/membros/tipos";
import {
  esquemaCancelamento,
  esquemaCategoria,
  esquemaConta,
  esquemaFechamento,
  esquemaLancamento,
  paraLinhaLancamento,
  saldoInicialParaDecimal,
} from "@/lib/financeiro/esquema";
import { z } from "zod";

const TESOURARIA = ["administrador", "tesoureiro"];
const SEM_PERMISSAO: ResultadoAcao = {
  ok: false,
  mensagem: "Você não tem permissão para executar esta ação.",
};
const ERRO_GENERICO = "Não foi possível salvar. Verifique os dados e tente novamente.";

async function tesouraria() {
  const u = await obterUsuarioAtual();
  return u && TESOURARIA.includes(u.papel) ? u : null;
}

/** Mensagens de regras do banco (gatilhos) são seguras para exibir; demais erros são genéricos. */
function mensagemDoBanco(error: { message?: string; code?: string } | null): string {
  const m = error?.message ?? "";
  const conhecidas = [
    "mês",
    "Lançamento cancelado",
    "categoria escolhida",
    "conta escolhida",
  ];
  if (error?.code === "P0001" && conhecidas.some((c) => m.includes(c))) return m;
  if (error?.code === "23505") return "Já existe um registro com esse nome.";
  return ERRO_GENERICO;
}

function revalidar() {
  revalidatePath("/financeiro", "layout");
  revalidatePath("/");
}

export async function salvarLancamento(entrada: unknown, id?: string): Promise<ResultadoAcao> {
  const usuario = await tesouraria();
  if (!usuario) return SEM_PERMISSAO;
  if (id && !z.string().uuid().safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };

  const analise = esquemaLancamento.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const linha = paraLinhaLancamento(analise.data);

  const supabase = criarClienteServidor();
  if (id) {
    const { data, error } = await supabase.from("lancamentos").update(linha).eq("id", id).select("id");
    if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
    if (!data || data.length === 0) return { ok: false, mensagem: "Lançamento não encontrado." };
  } else {
    const { error } = await supabase.from("lancamentos").insert({ ...linha, criado_por: usuario.id });
    if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
  }
  revalidar();
  return { ok: true, mensagem: id ? "Lançamento atualizado." : "Lançamento registrado com sucesso." };
}

export async function cancelarLancamento(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await tesouraria();
  if (!usuario) return SEM_PERMISSAO;
  const analise = esquemaCancelamento.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("lancamentos")
    .update({
      cancelado_em: new Date().toISOString(),
      cancelado_por: usuario.id,
      motivo_cancelamento: analise.data.motivo,
    })
    .eq("id", analise.data.id)
    .is("cancelado_em", null)
    .select("id");
  if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
  if (!data || data.length === 0) return { ok: false, mensagem: "Lançamento não encontrado ou já cancelado." };
  revalidar();
  return { ok: true, mensagem: "Lançamento cancelado. Ele deixa de contar nos totais." };
}

export async function salvarConta(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await tesouraria())) return SEM_PERMISSAO;
  const analise = esquemaConta.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const c = analise.data;
  const supabase = criarClienteServidor();

  if (c.id) {
    // O saldo inicial de uma conta existente não é alterado por aqui (preserva o histórico).
    const { data, error } = await supabase
      .from("contas")
      .update({ nome: c.nome, tipo: c.tipo, ativa: c.ativa })
      .eq("id", c.id)
      .select("id");
    if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
    if (!data || data.length === 0) return { ok: false, mensagem: "Conta não encontrada." };
  } else {
    const { error } = await supabase.from("contas").insert({
      nome: c.nome,
      tipo: c.tipo,
      saldo_inicial: saldoInicialParaDecimal(c.saldo_inicial),
      ativa: c.ativa,
    });
    if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
  }
  revalidar();
  return { ok: true, mensagem: "Conta salva." };
}

export async function salvarCategoria(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await tesouraria())) return SEM_PERMISSAO;
  const analise = esquemaCategoria.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const c = analise.data;
  const supabase = criarClienteServidor();
  const grupo = c.tipo === "receita" ? c.grupo : null;

  if (c.id) {
    // Tipo e grupo não mudam depois de criada (evita reclassificar o histórico).
    const { data, error } = await supabase
      .from("categorias_financeiras")
      .update({ nome: c.nome, ativa: c.ativa })
      .eq("id", c.id)
      .select("id");
    if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
    if (!data || data.length === 0) return { ok: false, mensagem: "Categoria não encontrada." };
  } else {
    const { error } = await supabase
      .from("categorias_financeiras")
      .insert({ nome: c.nome, tipo: c.tipo, grupo, ativa: c.ativa });
    if (error) return { ok: false, mensagem: mensagemDoBanco(error) };
  }
  revalidar();
  return { ok: true, mensagem: "Categoria salva." };
}

export async function fecharMes(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await tesouraria();
  if (!usuario) return SEM_PERMISSAO;
  const analise = esquemaFechamento.safeParse(entrada);
  if (!analise.success) return { ok: false, mensagem: "Mês inválido." };

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  if (analise.data.mes >= hoje.slice(0, 7)) {
    return { ok: false, mensagem: "Só é possível fechar meses já encerrados." };
  }
  const supabase = criarClienteServidor();
  const { error } = await supabase
    .from("fechamentos")
    .insert({ mes: `${analise.data.mes}-01`, fechado_por: usuario.id });
  if (error) {
    return {
      ok: false,
      mensagem: error.code === "23505" ? "Este mês já está fechado." : ERRO_GENERICO,
    };
  }
  revalidar();
  return { ok: true, mensagem: "Mês fechado. Os lançamentos dele não podem mais ser alterados." };
}

export async function reabrirMes(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario || usuario.papel !== "administrador") {
    return { ok: false, mensagem: "Apenas o administrador pode reabrir um mês." };
  }
  const analise = esquemaFechamento.safeParse(entrada);
  if (!analise.success) return { ok: false, mensagem: "Mês inválido." };

  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("fechamentos")
    .delete()
    .eq("mes", `${analise.data.mes}-01`)
    .select("mes");
  if (error || !data || data.length === 0) return { ok: false, mensagem: "Não foi possível reabrir o mês." };
  revalidar();
  return { ok: true, mensagem: "Mês reaberto." };
}
