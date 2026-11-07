"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/membros/tipos";

/** Cada pessoa liga ou desliga o próprio e-mail. A data do consentimento é gravada pelo banco. */
export async function alterarPreferenciaEmail(ativo: boolean): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return { ok: false, mensagem: "Entre na sua conta para alterar." };
  if (typeof ativo !== "boolean") return { ok: false, mensagem: "Pedido inválido." };
  const { error } = await criarClienteServidor().from("preferencias_email").upsert({ perfil_id: usuario.id, ativo }, { onConflict: "perfil_id" });
  if (error) return { ok: false, mensagem: "Não foi possível salvar. Tente novamente." };
  revalidatePath("/privacidade");
  return { ok: true, mensagem: ativo ? "Você passará a receber avisos por e-mail." : "Você não receberá mais avisos por e-mail." };
}
