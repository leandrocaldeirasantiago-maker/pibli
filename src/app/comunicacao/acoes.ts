"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { esquemaAviso, esquemaLink, esquemaPedidoOracao } from "@/lib/comunicacao/esquema";
import { hojeBr } from "@/lib/financeiro/periodo";
import type { ResultadoAcao } from "@/lib/membros/tipos";

const GESTAO = ["administrador", "pastor", "secretario"];
const SEM_LOGIN: ResultadoAcao = { ok: false, mensagem: "Sua sessão expirou. Entre novamente." };
const SEM_PERMISSAO: ResultadoAcao = { ok: false, mensagem: "Você não tem permissão para executar esta ação." };
const ERRO = "Não foi possível concluir a operação. Tente novamente.";
const UUID = z.string().uuid();
const nulo = (v: string) => (v.trim() === "" ? null : v.trim());

function revalidar() {
  revalidatePath("/comunicacao", "layout");
}

function linhaAviso(d: ReturnType<typeof esquemaAviso.parse>) {
  return {
    titulo: d.titulo,
    corpo: d.corpo,
    categoria: d.categoria,
    publico_alvo: d.publico_alvo,
    ministerio_id: d.publico_alvo === "ministerio" ? nulo(d.ministerio_id) : null,
    fixado: d.fixado,
    publicar_em: d.publicar_em === "" ? hojeBr() : d.publicar_em,
    expira_em: nulo(d.expira_em),
  };
}

// ---------- Avisos ----------
// A permissão final é do banco (RLS): líder só publica para o ministério que lidera.
export async function criarAviso(entrada: unknown): Promise<ResultadoAcao> {
  const u = await obterUsuarioAtual();
  if (!u) return SEM_LOGIN;
  if (![...GESTAO, "lider_ministerio"].includes(u.papel)) return SEM_PERMISSAO;
  const a = esquemaAviso.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("avisos")
    .insert({ ...linhaAviso(a.data), autor_id: u.id })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, mensagem: error?.code === "42501" ? "Você só pode publicar avisos para o ministério que lidera." : ERRO };
  }
  revalidar();
  return { ok: true, id: data.id, mensagem: "Aviso publicado." };
}

export async function atualizarAviso(id: string, entrada: unknown): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const a = esquemaAviso.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("avisos").update(linhaAviso(a.data)).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, id, mensagem: "Aviso atualizado." };
}

/** Avisos não são apagados: arquivam-se (e podem ser republicados). */
export async function alterarSituacaoAviso(id: string, status: "publicado" | "arquivado"): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success || !["publicado", "arquivado"].includes(status)) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("avisos").update({ status }).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, mensagem: status === "arquivado" ? "Aviso arquivado." : "Aviso republicado." };
}

// ---------- Pedidos de oração ----------
export async function criarPedidoOracao(entrada: unknown): Promise<ResultadoAcao> {
  const u = await obterUsuarioAtual();
  if (!u) return SEM_LOGIN;
  const a = esquemaPedidoOracao.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("pedidos_oracao").insert({ ...a.data, autor_id: u.id });
  if (error) return { ok: false, mensagem: ERRO };
  revalidar();
  return {
    ok: true,
    mensagem: a.data.visibilidade === "mural" ? "Pedido publicado no mural de oração." : "Pedido enviado à liderança pastoral.",
  };
}

export async function alterarSituacaoPedido(id: string, status: "aberto" | "respondido" | "arquivado"): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success || !["aberto", "respondido", "arquivado"].includes(status)) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("pedidos_oracao").update({ status }).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, mensagem: "Pedido atualizado." };
}

/** O autor (ou o administrador) pode apagar de vez: direito de eliminação da LGPD. */
export async function apagarPedidoOracao(id: string): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Pedido inválido." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("pedidos_oracao").delete().eq("id", id).select("id");
  if (error) return { ok: false, mensagem: ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, mensagem: "Pedido apagado." };
}

// ---------- Links úteis ----------
export async function salvarLink(entrada: unknown, id?: string): Promise<ResultadoAcao> {
  const u = await obterUsuarioAtual();
  if (!u) return SEM_LOGIN;
  if (!GESTAO.includes(u.papel)) return SEM_PERMISSAO;
  if (id && !UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const a = esquemaLink.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const linha = { ...a.data, descricao: nulo(a.data.descricao) };
  const supabase = criarClienteServidor();
  const { error } = id
    ? await supabase.from("links_uteis").update(linha).eq("id", id)
    : await supabase.from("links_uteis").insert(linha);
  if (error) return { ok: false, mensagem: ERRO };
  revalidar();
  return { ok: true, mensagem: id ? "Link atualizado." : "Link adicionado." };
}

export async function alternarLink(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const u = await obterUsuarioAtual();
  if (!u) return SEM_LOGIN;
  if (!GESTAO.includes(u.papel)) return SEM_PERMISSAO;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("links_uteis").update({ ativo }).eq("id", id);
  if (error) return { ok: false, mensagem: ERRO };
  revalidar();
  return { ok: true, mensagem: ativo ? "Link ativado." : "Link desativado." };
}
