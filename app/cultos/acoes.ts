"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/membros/tipos";
import { esquemaEscala, esquemaEvento, paraLinhaEvento } from "@/lib/cultos/esquema";
import { obterMeuMembroId } from "@/lib/cultos/consultas";
import { somarDias } from "@/lib/datas";
import { hojeBr } from "@/lib/financeiro/periodo";

const ERRO = "Não foi possível concluir a operação. Verifique os dados e tente novamente.";
const SEM_LOGIN: ResultadoAcao = { ok: false, mensagem: "Sua sessão expirou. Entre novamente." };
const UUID = z.string().uuid();

/** Mensagens levantadas pelas regras do banco são seguras para exibir; as demais são genéricas. */
const MENSAGENS_SEGURAS = [
  "Não há vagas disponíveis",
  "Este evento não aceita",
  "Não é possível escalar",
  "Evento cancelado",
  "Evento não encontrado",
  "Escala não encontrada",
  "Resposta inválida",
  "Lista de presença",
  "Sem permissão",
];

function msgBanco(error: { message?: string; code?: string } | null): string {
  const m = error?.message ?? "";
  if (error?.code === "P0001" && MENSAGENS_SEGURAS.some((s) => m.includes(s))) return m;
  if (error?.code === "23505") return "Esse registro já existe.";
  if (error?.code === "42501") return "Você não tem permissão para executar esta ação.";
  return ERRO;
}

function revalidar() {
  revalidatePath("/cultos", "layout");
  revalidatePath("/notificacoes");
  revalidatePath("/");
}

export async function criarEvento(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return SEM_LOGIN;
  const analise = esquemaEvento.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = analise.data;
  const base = paraLinhaEvento(d);
  const repeticoes = d.repetir_semanas === "" ? 0 : Number(d.repetir_semanas);
  const serie = repeticoes > 0 ? randomUUID() : null;

  const linhas = Array.from({ length: repeticoes + 1 }, (_, i) => ({
    ...base,
    data: somarDias(d.data, 7 * i),
    serie_id: serie,
    criado_por: usuario.id,
  }));

  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("eventos").insert(linhas).select("id, data").order("data");
  if (error || !data || data.length === 0) return { ok: false, mensagem: msgBanco(error) };

  revalidar();
  const n = data.length;
  return {
    ok: true,
    id: data[0].id,
    mensagem: n > 1 ? `${n} eventos criados (repetição semanal).` : "Evento criado com sucesso.",
  };
}

export async function atualizarEvento(id: string, entrada: unknown): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  const analise = esquemaEvento.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("eventos")
    .update(paraLinhaEvento(analise.data))
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, mensagem: msgBanco(error) };
  if (!data || data.length === 0) {
    return { ok: false, mensagem: "Evento não encontrado ou sem permissão para alterá-lo." };
  }
  revalidar();
  return { ok: true, id, mensagem: "Evento atualizado. Escalados e inscritos são avisados se a data ou o horário mudaram." };
}

export async function alterarStatusEvento(
  id: string,
  status: "realizado" | "cancelado",
): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success || !["realizado", "cancelado"].includes(status)) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const supabase = criarClienteServidor();
  const { data: atual } = await supabase.from("eventos").select("data, status").eq("id", id).maybeSingle();
  if (!atual) return { ok: false, mensagem: "Evento não encontrado ou sem permissão." };
  if (atual.status !== "agendado") return { ok: false, mensagem: "Só eventos agendados podem mudar de situação." };
  if (status === "realizado" && atual.data > hojeBr()) {
    return { ok: false, mensagem: "Só é possível marcar como realizado um evento que já aconteceu." };
  }
  const { data, error } = await supabase.from("eventos").update({ status }).eq("id", id).select("id");
  if (error) return { ok: false, mensagem: msgBanco(error) };
  if (!data || data.length === 0) return { ok: false, mensagem: "Sem permissão para alterar este evento." };
  revalidar();
  return {
    ok: true,
    mensagem: status === "cancelado" ? "Evento cancelado. Escalados e inscritos foram avisados." : "Evento marcado como realizado.",
  };
}

export async function salvarPresencas(eventoId: string, membroIds: string[]): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  const analise = z.object({ e: UUID, m: z.array(UUID).max(5000) }).safeParse({ e: eventoId, m: membroIds });
  if (!analise.success) return { ok: false, mensagem: "Dados inválidos." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.rpc("registrar_presencas", {
    p_evento: analise.data.e,
    p_membros: analise.data.m,
  });
  if (error) return { ok: false, mensagem: msgBanco(error) };
  revalidar();
  return { ok: true, mensagem: `Presenças salvas: ${Number(data ?? 0)} presente(s).` };
}

/** Inscreve o próprio usuário (sem membroId) ou, para quem gere o evento, outro membro. */
export async function inscreverMembro(eventoId: string, membroId?: string): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return SEM_LOGIN;
  if (!UUID.safeParse(eventoId).success || (membroId && !UUID.safeParse(membroId).success)) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const alvo = membroId ?? (await obterMeuMembroId(usuario.id));
  if (!alvo) {
    return {
      ok: false,
      mensagem: "Seu usuário ainda não está vinculado a um cadastro de membro. Procure a secretaria.",
    };
  }
  const supabase = criarClienteServidor();
  const { error } = await supabase
    .from("inscricoes")
    .insert({ evento_id: eventoId, membro_id: alvo, criado_por: usuario.id });
  if (error) {
    return { ok: false, mensagem: error.code === "23505" ? "Esse membro já está inscrito." : msgBanco(error) };
  }
  revalidar();
  return { ok: true, mensagem: "Inscrição realizada." };
}

export async function removerInscricao(eventoId: string, membroId: string): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(eventoId).success || !UUID.safeParse(membroId).success) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const supabase = criarClienteServidor();
  const { data, error } = await supabase
    .from("inscricoes")
    .delete()
    .eq("evento_id", eventoId)
    .eq("membro_id", membroId)
    .select("membro_id");
  if (error) return { ok: false, mensagem: msgBanco(error) };
  if (!data || data.length === 0) return { ok: false, mensagem: "Inscrição não encontrada." };
  revalidar();
  return { ok: true, mensagem: "Inscrição cancelada." };
}

export async function adicionarEscala(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return SEM_LOGIN;
  const analise = esquemaEscala.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const e = analise.data;
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("escalas").insert({
    evento_id: e.evento_id,
    ministerio_id: e.ministerio_id === "" ? null : e.ministerio_id,
    funcao: e.funcao,
    membro_id: e.membro_id,
    observacao: e.observacao === "" ? null : e.observacao,
    criado_por: usuario.id,
  });
  if (error) {
    return { ok: false, mensagem: error.code === "23505" ? "Esse membro já está nessa função." : msgBanco(error) };
  }
  revalidar();
  return { ok: true, mensagem: "Voluntário escalado. Se tiver acesso ao sistema, foi notificado." };
}

export async function removerEscala(id: string): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Pedido inválido." };
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("escalas").delete().eq("id", id).select("id");
  if (error) return { ok: false, mensagem: msgBanco(error) };
  if (!data || data.length === 0) return { ok: false, mensagem: "Escala não encontrada ou sem permissão." };
  revalidar();
  return { ok: true, mensagem: "Voluntário removido da escala." };
}

export async function responderEscala(id: string, resposta: "confirmado" | "indisponivel"): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return SEM_LOGIN;
  if (!UUID.safeParse(id).success || !["confirmado", "indisponivel"].includes(resposta)) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const supabase = criarClienteServidor();
  const { error } = await supabase.rpc("responder_escala", { p_id: id, p_status: resposta });
  if (error) return { ok: false, mensagem: msgBanco(error) };
  revalidar();
  return { ok: true, mensagem: resposta === "confirmado" ? "Presença confirmada. Obrigado!" : "Indisponibilidade registrada." };
}
