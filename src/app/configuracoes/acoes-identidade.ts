"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { BUCKET_IDENTIDADE, CAMINHO_LOGO, LIMITE_BYTES_LOGO, MIME_POR_EXTENSAO, nomeArquivoLogo, validarLogo } from "@/lib/configuracoes/logo";
import type { ResultadoAcao } from "@/lib/membros/tipos";

const SEM_PERMISSAO: ResultadoAcao = { ok: false, mensagem: "Apenas administradores podem executar esta ação." };
const ERRO = "Não foi possível concluir a operação. Tente novamente.";

async function admin() {
  const u = await obterUsuarioAtual();
  return u?.papel === "administrador" ? u : null;
}

async function caminhoAtual(supabase: ReturnType<typeof criarClienteServidor>): Promise<string | null> {
  const { data } = await supabase.from("configuracoes_igreja").select("logo_caminho").maybeSingle();
  const c = (data as { logo_caminho: string | null } | null)?.logo_caminho ?? null;
  return c && CAMINHO_LOGO.test(c) ? c : null;
}

export async function enviarLogo(formData: FormData): Promise<ResultadoAcao> {
  if (!(await admin())) return SEM_PERMISSAO;
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, mensagem: "Escolha uma imagem." };
  if (arquivo.size > LIMITE_BYTES_LOGO) return { ok: false, mensagem: "A imagem deve ter no máximo 300 KB." };

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const v = validarLogo(bytes); // confere os bytes; o tipo informado pelo navegador não é confiável
  if (!v.ok) return { ok: false, mensagem: v.mensagem };

  const supabase = criarClienteServidor();
  const antigo = await caminhoAtual(supabase);
  const nome = nomeArquivoLogo(v.extensao, crypto.getRandomValues(new Uint8Array(8)));

  const { error: erroUpload } = await supabase.storage.from(BUCKET_IDENTIDADE).upload(nome, bytes, {
    contentType: MIME_POR_EXTENSAO[v.extensao],
    upsert: false,
    cacheControl: "31536000",
  });
  if (erroUpload) return { ok: false, mensagem: ERRO };

  const { error } = await supabase.from("configuracoes_igreja").update({ logo_caminho: nome }).eq("id", true);
  if (error) {
    await supabase.storage.from(BUCKET_IDENTIDADE).remove([nome]); // não deixa arquivo órfão
    return { ok: false, mensagem: ERRO };
  }
  if (antigo) await supabase.storage.from(BUCKET_IDENTIDADE).remove([antigo]); // limpeza; se falhar, só sobra um arquivo pequeno
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Logotipo atualizado." };
}

export async function removerLogo(): Promise<ResultadoAcao> {
  if (!(await admin())) return SEM_PERMISSAO;
  const supabase = criarClienteServidor();
  const antigo = await caminhoAtual(supabase);
  const { error } = await supabase.from("configuracoes_igreja").update({ logo_caminho: null }).eq("id", true);
  if (error) return { ok: false, mensagem: ERRO };
  if (antigo) await supabase.storage.from(BUCKET_IDENTIDADE).remove([antigo]);
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Voltou ao logotipo padrão." };
}

/** Só liga a exigência quem já está com sessão de segundo fator (aal2): assim ninguém se tranca para fora sem ter cadastrado o aplicativo. */
export async function alterarMfaObrigatorio(ativo: boolean): Promise<ResultadoAcao> {
  if (!(await admin())) return SEM_PERMISSAO;
  const supabase = criarClienteServidor();
  if (ativo) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2") {
      return { ok: false, mensagem: "Antes de ligar, cadastre o aplicativo autenticador e entre usando o código (botão abaixo)." };
    }
  }
  const { error } = await supabase.from("configuracoes_igreja").update({ mfa_obrigatorio: ativo }).eq("id", true);
  if (error) return { ok: false, mensagem: ERRO };
  revalidatePath("/configuracoes", "layout");
  return { ok: true, mensagem: ativo ? "Segundo fator obrigatório para administradores." : "Segundo fator deixou de ser obrigatório." };
}
