"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import {
  chaveMusica,
  esquemaItemRepertorio,
  esquemaMusica,
  esquemaRepertorio,
  paraLinhaMusica,
} from "@/lib/louvor/esquema";
import type { ResultadoAcao } from "@/lib/membros/tipos";

const SEM_LOGIN: ResultadoAcao = { ok: false, mensagem: "Sua sessão expirou. Entre novamente." };
const SEM_PERMISSAO: ResultadoAcao = { ok: false, mensagem: "Você não tem permissão para gerir o Louvor." };
const ERRO = "Não foi possível concluir a operação. Tente novamente.";
const UUID = z.string().uuid();
const nulo = (v: string) => (v.trim() === "" ? null : v.trim());

function revalidar() {
  revalidatePath("/louvor", "layout");
}

/** A palavra final é do banco (RLS); esta checagem só dá a resposta clara antes. */
async function podeGerir(): Promise<"login" | "nao" | "sim"> {
  if (!(await obterUsuarioAtual())) return "login";
  const supabase = criarClienteServidor();
  const { data } = await supabase.rpc("gere_louvor");
  return data === true ? "sim" : "nao";
}

async function exigir(): Promise<ResultadoAcao | null> {
  const p = await podeGerir();
  return p === "login" ? SEM_LOGIN : p === "nao" ? SEM_PERMISSAO : null;
}

function mensagemMusica(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "Já existe uma música com esse título e artista.";
  if (error.code === "23514") return "Dados inválidos: confira a base de autorização, o tom e o BPM.";
  return error.code === "42501" ? SEM_PERMISSAO.mensagem : ERRO;
}

// ---------- Músicas ----------
export async function criarMusica(entrada: unknown): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  const a = esquemaMusica.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const d = a.data;
  const supabase = criarClienteServidor();

  // Duplicidade "parecida" (acentos, pontuação, maiúsculas), além do índice único do banco.
  const { data: parecidas } = await supabase.from("musicas").select("titulo, artista").ilike("titulo", `%${d.titulo.replace(/[%_,()]/g, " ").trim().slice(0, 40)}%`).limit(20);
  const chave = chaveMusica(d.titulo, d.artista);
  if ((parecidas ?? []).some((m: { titulo: string; artista: string | null }) => chaveMusica(m.titulo, m.artista ?? "") === chave)) {
    return { ok: false, mensagem: "Já existe uma música com esse título e artista (mesmo com acentos ou pontuação diferentes)." };
  }

  const u = await obterUsuarioAtual();
  const { data, error } = await supabase.from("musicas").insert({ ...paraLinhaMusica(d), criado_por: u?.id }).select("id").single();
  if (error || !data) return { ok: false, mensagem: error ? mensagemMusica(error) : ERRO };
  revalidar();
  return { ok: true, id: data.id, mensagem: "Música cadastrada." };
}

export async function atualizarMusica(id: string, entrada: unknown): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const a = esquemaMusica.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("musicas").update(paraLinhaMusica(a.data)).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: mensagemMusica(error) };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, id, mensagem: "Música atualizada." };
}

/** Músicas não são apagadas (podem estar em repertórios antigos): desativam-se. */
export async function alternarMusica(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("musicas").update({ ativo }).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, mensagem: ativo ? "Música reativada." : "Música desativada." };
}

// ---------- Repertórios ----------
export async function criarRepertorio(entrada: unknown): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  const a = esquemaRepertorio.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const u = await obterUsuarioAtual();
  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("repertorios")
    .insert({ titulo: a.data.titulo, evento_id: nulo(a.data.evento_id), observacoes: nulo(a.data.observacoes), criado_por: u?.id })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, mensagem: error?.code === "23505" ? "Esse evento já tem um repertório. Abra-o ou arquive-o antes de criar outro." : ERRO };
  }
  revalidar();
  return { ok: true, id: data.id, mensagem: "Repertório criado." };
}

export async function atualizarRepertorio(id: string, entrada: unknown): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const a = esquemaRepertorio.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("repertorios")
    .update({ titulo: a.data.titulo, evento_id: nulo(a.data.evento_id), observacoes: nulo(a.data.observacoes) })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, mensagem: error.code === "23505" ? "Esse evento já tem outro repertório." : ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, id, mensagem: "Repertório atualizado." };
}

export async function alterarStatusRepertorio(id: string, status: "rascunho" | "publicado" | "arquivado"): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  if (!UUID.safeParse(id).success || !["rascunho", "publicado", "arquivado"].includes(status)) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const supabase = criarClienteServidor();
  if (status === "publicado") {
    const { count } = await supabase.from("repertorio_itens").select("id", { count: "exact", head: true }).eq("repertorio_id", id);
    if (!count) return { ok: false, mensagem: "Adicione pelo menos uma música antes de publicar." };
  }
  const { data, error } = await supabase.from("repertorios").update({ status }).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: error.code === "23505" ? "Esse evento já tem outro repertório ativo." : ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  const texto = { publicado: "Repertório publicado. Os escalados do Louvor foram avisados.", rascunho: "Repertório voltou a rascunho.", arquivado: "Repertório arquivado." }[status];
  return { ok: true, mensagem: texto };
}

export async function adicionarItem(entrada: unknown): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  const a = esquemaItemRepertorio.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = criarClienteServidor();
  const { data: ultimo } = await supabase
    .from("repertorio_itens")
    .select("ordem")
    .eq("repertorio_id", a.data.repertorio_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("repertorio_itens").insert({
    repertorio_id: a.data.repertorio_id,
    musica_id: a.data.musica_id,
    ordem: ((ultimo as { ordem: number } | null)?.ordem ?? 0) + 1,
    tom: nulo(a.data.tom),
    observacao: nulo(a.data.observacao),
  });
  if (error) {
    if (error.code === "23505") return { ok: false, mensagem: "Essa música já está no repertório." };
    const permitidas = ["Esta música está inativa e não pode entrar em repertório.", "Repertório arquivado não pode ser alterado."];
    return { ok: false, mensagem: permitidas.find((p) => error.message?.includes(p)) ?? ERRO };
  }
  revalidar();
  return { ok: true, mensagem: "Música adicionada." };
}

export async function atualizarItem(id: string, tom: string, observacao: string): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  const a = z
    .object({ id: UUID, tom: z.string().trim().regex(/^([A-G][#b]?m?)?$/, "Tom inválido."), observacao: z.string().trim().max(200, "Máximo de 200 caracteres.") })
    .safeParse({ id, tom, observacao });
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("repertorio_itens").update({ tom: nulo(a.data.tom), observacao: nulo(a.data.observacao) }).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: error.message?.includes("arquivado") ? "Repertório arquivado não pode ser alterado." : ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, mensagem: "Item atualizado." };
}

export async function removerItem(id: string): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Pedido inválido." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("repertorio_itens").delete().eq("id", id).select("id");
  if (error) return { ok: false, mensagem: ERRO };
  if (!data || data.length === 0) return SEM_PERMISSAO;
  revalidar();
  return { ok: true, mensagem: "Música removida do repertório." };
}

export async function moverItem(id: string, direcao: -1 | 1): Promise<ResultadoAcao> {
  const bloqueio = await exigir();
  if (bloqueio) return bloqueio;
  if (!UUID.safeParse(id).success || ![-1, 1].includes(direcao)) return { ok: false, mensagem: "Pedido inválido." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.rpc("mover_item_repertorio", { p_item: id, p_direcao: direcao });
  if (error) return { ok: false, mensagem: ERRO };
  revalidar();
  return { ok: true, mensagem: "Ordem atualizada." };
}
