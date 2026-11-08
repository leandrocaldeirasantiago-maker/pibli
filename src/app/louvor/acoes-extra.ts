"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/membros/tipos";

/** Favoritar é pessoal: vale só para o usuário logado (o RLS do banco garante isso e exige ser do Louvor). */
export async function alternarFavorita(musicaId: string, favorita: boolean): Promise<ResultadoAcao> {
  const u = await obterUsuarioAtual();
  if (!u) return { ok: false, mensagem: "Sua sessão expirou. Entre novamente." };
  if (!z.string().uuid().safeParse(musicaId).success) return { ok: false, mensagem: "Registro inválido." };
  const supabase = criarClienteServidor();
  const { error } = favorita
    ? await supabase.from("musicas_favoritas").upsert({ perfil_id: u.id, musica_id: musicaId }, { onConflict: "perfil_id,musica_id", ignoreDuplicates: true })
    : await supabase.from("musicas_favoritas").delete().eq("perfil_id", u.id).eq("musica_id", musicaId);
  if (error) return { ok: false, mensagem: "Não foi possível atualizar as favoritas." };
  revalidatePath("/louvor", "layout");
  return { ok: true, mensagem: favorita ? "Adicionada às favoritas." : "Removida das favoritas." };
}
