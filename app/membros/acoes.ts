"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import {
  esquemaHistorico,
  esquemaMembro,
  esquemaVisitante,
  paraLinhaMembro,
  somenteDigitos,
} from "@/lib/membros/esquema";
import {
  PAPEIS_GESTAO,
  TAMANHO_MAX_FOTO,
  TIPOS_FOTO,
  escaparLike,
  type ResultadoAcao,
} from "@/lib/membros/tipos";

const SEM_PERMISSAO: ResultadoAcao = {
  ok: false,
  mensagem: "Você não tem permissão para executar esta ação.",
};
const ERRO_GENERICO = "Não foi possível salvar. Verifique os dados e tente novamente.";

async function usuarioGestao() {
  const u = await obterUsuarioAtual();
  return u && PAPEIS_GESTAO.includes(u.papel) ? u : null;
}

export async function salvarMembro(formData: FormData): Promise<ResultadoAcao> {
  const usuario = await usuarioGestao();
  if (!usuario) return SEM_PERMISSAO;

  const idBruto = formData.get("id");
  const id = typeof idBruto === "string" && idBruto !== "" ? idBruto : null;
  if (id && !z.string().uuid().safeParse(id).success) {
    return { ok: false, mensagem: "Registro inválido." };
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(String(formData.get("dados") ?? ""));
  } catch {
    return { ok: false, mensagem: "Dados do formulário inválidos." };
  }
  const analise = esquemaMembro.safeParse(bruto);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = analise.data;

  const foto = formData.get("foto");
  const arquivo = foto instanceof File && foto.size > 0 ? foto : null;
  if (arquivo) {
    if (!(arquivo.type in TIPOS_FOTO)) {
      return { ok: false, mensagem: "A foto deve ser JPG, PNG ou WebP." };
    }
    if (arquivo.size > TAMANHO_MAX_FOTO) {
      return { ok: false, mensagem: "A foto deve ter no máximo 2 MB." };
    }
  }

  const supabase = criarClienteServidor();

  // Família: reutiliza pelo nome (sem diferenciar maiúsculas) ou cria
  let familiaId: string | null = null;
  if (d.familia_nome) {
    const { data: existente } = await supabase
      .from("familias")
      .select("id")
      .ilike("nome", escaparLike(d.familia_nome))
      .maybeSingle();
    if (existente) {
      familiaId = existente.id;
    } else {
      const { data: nova, error } = await supabase
        .from("familias")
        .insert({ nome: d.familia_nome })
        .select("id")
        .single();
      if (error || !nova) return { ok: false, mensagem: ERRO_GENERICO };
      familiaId = nova.id;
    }
  }

  const linha = { ...paraLinhaMembro(d), familia_id: familiaId };
  let membroId = id;

  if (id) {
    const { data, error } = await supabase.from("membros").update(linha).eq("id", id).select("id");
    if (error || !data || data.length === 0) return { ok: false, mensagem: ERRO_GENERICO };
  } else {
    const { data, error } = await supabase
      .from("membros")
      .insert({ ...linha, criado_por: usuario.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, mensagem: ERRO_GENERICO };
    membroId = data.id;
  }
  if (!membroId) return { ok: false, mensagem: ERRO_GENERICO };

  // Ministérios: remove os desmarcados e adiciona os novos
  const { data: atuais } = await supabase
    .from("membros_ministerios")
    .select("ministerio_id")
    .eq("membro_id", membroId);
  const atuaisIds = (atuais ?? []).map((x) => x.ministerio_id as string);
  const remover = atuaisIds.filter((x) => !d.ministerios.includes(x));
  const adicionar = d.ministerios.filter((x) => !atuaisIds.includes(x));
  if (remover.length > 0) {
    await supabase
      .from("membros_ministerios")
      .delete()
      .eq("membro_id", membroId)
      .in("ministerio_id", remover);
  }
  if (adicionar.length > 0) {
    const { error } = await supabase
      .from("membros_ministerios")
      .insert(adicionar.map((ministerio_id) => ({ membro_id: membroId, ministerio_id })));
    if (error) {
      return { ok: false, mensagem: "Membro salvo, mas não foi possível atualizar os ministérios.", id: membroId };
    }
  }

  // Foto
  if (arquivo) {
    const caminho = `${membroId}/${crypto.randomUUID()}.${TIPOS_FOTO[arquivo.type]}`;
    const { error: erroEnvio } = await supabase.storage
      .from("fotos-membros")
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
    if (erroEnvio) {
      return { ok: false, mensagem: "Membro salvo, mas não foi possível enviar a foto.", id: membroId };
    }
    const { data: antigo } = await supabase
      .from("membros")
      .select("foto_path")
      .eq("id", membroId)
      .single();
    await supabase.from("membros").update({ foto_path: caminho }).eq("id", membroId);
    if (antigo?.foto_path) {
      await supabase.storage.from("fotos-membros").remove([antigo.foto_path]);
    }
  }

  revalidatePath("/membros");
  revalidatePath(`/membros/${membroId}`);
  revalidatePath("/");
  return { ok: true, mensagem: id ? "Membro atualizado com sucesso." : "Membro cadastrado com sucesso.", id: membroId };
}

export async function excluirMembro(id: string): Promise<ResultadoAcao> {
  const usuario = await obterUsuarioAtual();
  if (!usuario || usuario.papel !== "administrador") {
    return { ok: false, mensagem: "Apenas o administrador pode excluir membros." };
  }
  if (!z.string().uuid().safeParse(id).success) return { ok: false, mensagem: "Registro inválido." };

  const supabase = criarClienteServidor();
  const { data: atual } = await supabase.from("membros").select("foto_path").eq("id", id).single();
  const { data, error } = await supabase.from("membros").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, mensagem: "Não foi possível excluir o membro." };
  }
  if (atual?.foto_path) await supabase.storage.from("fotos-membros").remove([atual.foto_path]);

  revalidatePath("/membros");
  revalidatePath("/");
  return { ok: true, mensagem: "Membro excluído." };
}

export async function registrarParticipacao(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await usuarioGestao())) return SEM_PERMISSAO;
  const analise = esquemaHistorico.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { membroId, tipo, descricao, data } = analise.data;
  const usuario = await obterUsuarioAtual();
  const supabase = criarClienteServidor();
  const { error } = await supabase
    .from("historico_participacao")
    .insert({ membro_id: membroId, tipo, descricao, data, criado_por: usuario?.id });
  if (error) return { ok: false, mensagem: ERRO_GENERICO };
  revalidatePath(`/membros/${membroId}`);
  return { ok: true, mensagem: "Registro adicionado ao histórico." };
}

export async function salvarVisitante(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await usuarioGestao();
  if (!usuario) return SEM_PERMISSAO;
  const analise = esquemaVisitante.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const v = analise.data;
  const supabase = criarClienteServidor();
  const { error } = await supabase.from("visitantes").insert({
    nome: v.nome,
    telefone: v.telefone === "" ? null : somenteDigitos(v.telefone),
    data_visita: v.data_visita,
    observacao: v.observacao === "" ? null : v.observacao,
    criado_por: usuario.id,
  });
  if (error) return { ok: false, mensagem: ERRO_GENERICO };
  revalidatePath("/membros/visitantes");
  revalidatePath("/");
  return { ok: true, mensagem: "Visitante registrado." };
}
