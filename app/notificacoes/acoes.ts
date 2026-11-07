"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/membros/tipos";

/** Marca como lidas as notificações do próprio usuário (todas, se nenhum id for informado). */
export async function marcarLidas(ids?: string[]): Promise<ResultadoAcao> {
  if (!(await obterUsuarioAtual())) return { ok: false, mensagem: "Sua sessão expirou. Entre novamente." };
  const analise = z.array(z.string().uuid()).max(200).optional().safeParse(ids);
  if (!analise.success) return { ok: false, mensagem: "Pedido inválido." };

  const supabase = criarClienteServidor();
  const { error } = await supabase.rpc("marcar_notificacoes_lidas", { p_ids: analise.data ?? null });
  if (error) return { ok: false, mensagem: "Não foi possível atualizar as notificações." };
  revalidatePath("/notificacoes");
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Notificações marcadas como lidas." };
}
