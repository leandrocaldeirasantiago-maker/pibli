"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterUsuarioAtual, criarClienteServidor } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/membros/tipos";

const GESTAO_MINISTERIOS = ["administrador", "pastor"];
const GESTAO_PARTICIPANTES = ["administrador", "pastor", "secretario"];
const SEM_PERMISSAO: ResultadoAcao = { ok: false, mensagem: "Você não tem permissão para executar esta ação." };
const ERRO = "Não foi possível concluir a operação. Tente novamente.";
const UUID = z.string().uuid();

const esquemaMinisterio = z.object({
  nome: z.string().trim().min(2, "Informe o nome do ministério.").max(80, "Máximo de 80 caracteres."),
  descricao: z.string().trim().max(300, "Máximo de 300 caracteres."),
});

const esquemaParticipante = z.object({
  ministerio_id: UUID,
  membro_id: z.string().uuid("Selecione o membro."),
  funcao: z.enum(["participante", "lider"]),
});

async function comPapel(papeis: string[]) {
  const u = await obterUsuarioAtual();
  return u && papeis.includes(u.papel) ? u : null;
}

function revalidar() {
  revalidatePath("/ministerios", "layout");
  revalidatePath("/membros", "layout");
}

export async function criarMinisterio(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await comPapel(GESTAO_MINISTERIOS))) return SEM_PERMISSAO;
  const a = esquemaMinisterio.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("ministerios")
    .insert({ nome: a.data.nome, descricao: a.data.descricao === "" ? null : a.data.descricao })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, mensagem: error?.code === "23505" ? "Já existe um ministério com esse nome." : ERRO };
  }
  revalidar();
  return { ok: true, id: data.id, mensagem: "Ministério criado." };
}

export async function atualizarMinisterio(id: string, entrada: unknown): Promise<ResultadoAcao> {
  if (!(await comPapel(GESTAO_MINISTERIOS))) return SEM_PERMISSAO;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const a = esquemaMinisterio.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("ministerios")
    .update({ nome: a.data.nome, descricao: a.data.descricao === "" ? null : a.data.descricao })
    .eq("id", id)
    .select("id");
  if (error) {
    return { ok: false, mensagem: error.code === "23505" ? "Já existe um ministério com esse nome." : ERRO };
  }
  if (!data || data.length === 0) return { ok: false, mensagem: "Ministério não encontrado." };
  revalidar();
  return { ok: true, mensagem: "Ministério atualizado." };
}

export async function alternarMinisterio(id: string, ativo: boolean): Promise<ResultadoAcao> {
  if (!(await comPapel(GESTAO_MINISTERIOS))) return SEM_PERMISSAO;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("ministerios").update({ ativo }).eq("id", id).select("id");
  if (error || !data || data.length === 0) return { ok: false, mensagem: ERRO };
  revalidar();
  return { ok: true, mensagem: ativo ? "Ministério ativado." : "Ministério desativado." };
}

export async function adicionarParticipante(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await comPapel(GESTAO_PARTICIPANTES))) return SEM_PERMISSAO;
  const a = esquemaParticipante.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = criarClienteServidor();
  const { error } = await supabase.from("membros_ministerios").insert({
    ministerio_id: a.data.ministerio_id,
    membro_id: a.data.membro_id,
    funcao: a.data.funcao,
  });
  if (error) {
    return { ok: false, mensagem: error.code === "23505" ? "Esse membro já participa do ministério." : ERRO };
  }
  revalidar();
  return { ok: true, mensagem: "Participante adicionado." };
}

export async function alterarFuncaoParticipante(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await comPapel(GESTAO_PARTICIPANTES))) return SEM_PERMISSAO;
  const a = esquemaParticipante.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("membros_ministerios")
    .update({ funcao: a.data.funcao })
    .eq("ministerio_id", a.data.ministerio_id)
    .eq("membro_id", a.data.membro_id)
    .select("membro_id");
  if (error || !data || data.length === 0) return { ok: false, mensagem: ERRO };
  revalidar();
  return { ok: true, mensagem: a.data.funcao === "lider" ? "Definido como líder." : "Função atualizada." };
}

export async function removerParticipante(ministerioId: string, membroId: string): Promise<ResultadoAcao> {
  if (!(await comPapel(GESTAO_PARTICIPANTES))) return SEM_PERMISSAO;
  if (!UUID.safeParse(ministerioId).success || !UUID.safeParse(membroId).success) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("membros_ministerios")
    .delete()
    .eq("ministerio_id", ministerioId)
    .eq("membro_id", membroId)
    .select("membro_id");
  if (error || !data || data.length === 0) return { ok: false, mensagem: ERRO };
  revalidar();
  return { ok: true, mensagem: "Participante removido do ministério." };
}
