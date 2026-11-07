"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { esquemaIgreja, esquemaPapelUsuario } from "@/lib/configuracoes/esquema";
import type { ResultadoAcao } from "@/lib/membros/tipos";

const SEM_PERMISSAO: ResultadoAcao = { ok: false, mensagem: "Apenas administradores podem executar esta ação." };
const ERRO = "Não foi possível concluir a operação. Tente novamente.";
const UUID = z.string().uuid();
const nulo = (v: string) => (v.trim() === "" ? null : v.trim());

async function admin() {
  const u = await obterUsuarioAtual();
  return u?.papel === "administrador" ? u : null;
}

/** Mostra só mensagens que nós mesmos definimos no banco; qualquer outra vira texto genérico. */
function mensagemDoBanco(m: string | undefined): string {
  const permitidas = [
    "O sistema precisa de pelo menos um administrador ativo.",
    "Este membro já está vinculado a outro usuário.",
    "Membro não encontrado.",
    "Usuário não encontrado.",
  ];
  return permitidas.find((p) => m?.includes(p)) ?? ERRO;
}

export async function salvarConfiguracoes(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await admin())) return SEM_PERMISSAO;
  const a = esquemaIgreja.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  const d = a.data;
  const supabase = criarClienteServidor();
  const { error } = await supabase
    .from("configuracoes_igreja")
    .update({ nome: d.nome, cidade: nulo(d.cidade), endereco: nulo(d.endereco), telefone: nulo(d.telefone), email: nulo(d.email), site: nulo(d.site), encarregado_nome: nulo(d.encarregado_nome), encarregado_email: nulo(d.encarregado_email) })
    .eq("id", true);
  if (error) return { ok: false, mensagem: ERRO };
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas." };
}

export async function alterarPapelUsuario(entrada: unknown): Promise<ResultadoAcao> {
  const eu = await admin();
  if (!eu) return SEM_PERMISSAO;
  const a = esquemaPapelUsuario.safeParse(entrada);
  if (!a.success) return { ok: false, mensagem: a.error.issues[0]?.message ?? "Dados inválidos." };
  if (a.data.id === eu.id) return { ok: false, mensagem: "Você não pode alterar o seu próprio papel." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("perfis").update({ papel: a.data.papel }).eq("id", a.data.id);
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.message) };
  revalidatePath("/configuracoes", "layout");
  return { ok: true, mensagem: "Papel atualizado." };
}

export async function alterarAtivoUsuario(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const eu = await admin();
  if (!eu) return SEM_PERMISSAO;
  if (!UUID.safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };
  if (id === eu.id) return { ok: false, mensagem: "Você não pode desativar o seu próprio acesso." };
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("perfis").update({ ativo }).eq("id", id);
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.message) };
  revalidatePath("/configuracoes", "layout");
  return { ok: true, mensagem: ativo ? "Acesso reativado." : "Acesso desativado." };
}

export async function vincularMembro(perfilId: string, membroId: string | null): Promise<ResultadoAcao> {
  if (!(await admin())) return SEM_PERMISSAO;
  if (!UUID.safeParse(perfilId).success || (membroId !== null && !UUID.safeParse(membroId).success)) {
    return { ok: false, mensagem: "Registro inválido." };
  }
  const supabase = criarClienteServidor();
  const { error } = await supabase.rpc("vincular_usuario_membro", { p_perfil: perfilId, p_membro: membroId });
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.message) };
  revalidatePath("/", "layout");
  return { ok: true, mensagem: membroId ? "Usuário vinculado ao membro." : "Vínculo removido." };
}

/** Pix estático, sem valor fixo. Nunca ativa sem chave validada. */
export async function salvarPix(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await admin())) return SEM_PERMISSAO;
  const schema = z.object({
    tipo: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]),
    chave: z.string().trim().min(3).max(120),
    ativo: z.boolean(),
  });
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) return { ok: false, mensagem: "Dados Pix inválidos." };
  const { tipo, chave, ativo } = parsed.data;
  const digitos = chave.replace(/\D/g, "");
  const valido = tipo === "cpf" ? digitos.length === 11 && chave === digitos
    : tipo === "cnpj" ? digitos.length === 14 && chave === digitos
    : tipo === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)
    : tipo === "telefone" ? /^\+[1-9]\d{7,14}$/.test(chave)
    : /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(chave);
  if (!valido) return { ok: false, mensagem: "Formato da chave incompatível com o tipo selecionado." };
  const { error } = await criarClienteServidor().from("configuracoes_igreja")
    .update({ pix_chave: chave, pix_tipo: tipo, pix_ativo: ativo }).eq("id", true);
  if (error) return { ok: false, mensagem: ERRO };
  revalidatePath("/configuracoes");
  return { ok: true, mensagem: ativo ? "Pix habilitado para validação." : "Chave salva; Pix permanece desabilitado." };
}
