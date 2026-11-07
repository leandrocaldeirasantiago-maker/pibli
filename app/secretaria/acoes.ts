"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import type { ResultadoAcao } from "@/lib/membros/tipos";
import { esquemaAnulacao, esquemaDocumento, type TipoDocumento } from "@/lib/secretaria/esquema";
import { textoSugerido, tituloPadrao } from "@/lib/secretaria/modelos";
import { obterMembroParaDocumento } from "@/lib/secretaria/consultas";
import { hojeBr } from "@/lib/financeiro/periodo";

const SECRETARIA = ["administrador", "pastor", "secretario"];
const SEM_PERMISSAO: ResultadoAcao = { ok: false, mensagem: "Você não tem permissão para executar esta ação." };
const ERRO = "Não foi possível concluir a operação. Verifique os dados e tente novamente.";

/** Mensagens levantadas pelas regras do banco que são seguras para exibir. */
const MENSAGENS_SEGURAS = [
  "Selecione um membro válido",
  "O membro não tem data de batismo",
  "Sem permissão",
  "Informe o motivo",
  "Documento não encontrado",
  "Documento já anulado",
];

function msgBanco(error: { message?: string; code?: string } | null): string {
  const m = error?.message ?? "";
  if (error?.code === "P0001" && MENSAGENS_SEGURAS.some((s) => m.includes(s))) return m;
  if (error?.code === "42501") return SEM_PERMISSAO.mensagem;
  return ERRO;
}

async function secretaria() {
  const u = await obterUsuarioAtual();
  return u && SECRETARIA.includes(u.papel) ? u : null;
}

/** Texto inicial sugerido para o tipo/membro escolhidos. O usuário revisa e edita antes de emitir. */
export async function sugerirTextoDocumento(entrada: {
  tipo: string;
  membro_id: string;
  destino?: string;
  finalidade?: string;
}): Promise<{ ok: boolean; titulo: string; texto: string; mensagem?: string }> {
  if (!(await secretaria())) return { ok: false, titulo: "", texto: "", mensagem: SEM_PERMISSAO.mensagem };
  const analise = z
    .object({
      tipo: z.enum(["declaracao_membro", "carta_transferencia", "certificado_batismo", "administrativo"]),
      membro_id: z.string().refine((v) => v === "" || z.string().uuid().safeParse(v).success),
      destino: z.string().max(120).optional(),
      finalidade: z.string().max(120).optional(),
    })
    .safeParse(entrada);
  if (!analise.success) return { ok: false, titulo: "", texto: "", mensagem: "Pedido inválido." };
  const { tipo, membro_id, destino, finalidade } = analise.data;

  const titulo = tituloPadrao(tipo as TipoDocumento);
  if (tipo === "administrativo" || membro_id === "") return { ok: true, titulo, texto: "" };

  const membro = await obterMembroParaDocumento(membro_id);
  if (!membro) return { ok: false, titulo, texto: "", mensagem: "Membro não encontrado." };
  return { ok: true, titulo, texto: textoSugerido(tipo as TipoDocumento, membro, { destino, finalidade }) };
}

export async function emitirDocumento(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await secretaria();
  if (!usuario) return SEM_PERMISSAO;
  const analise = esquemaDocumento.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = analise.data;
  const supabase = criarClienteServidor();

  const { data: id, error } = await supabase.rpc("emitir_documento", {
    p_tipo: d.tipo,
    p_membro_id: d.membro_id === "" ? null : d.membro_id,
    p_titulo: d.titulo,
    p_conteudo: d.conteudo,
    p_dados: {
      local: d.local,
      signatario_nome: d.signatario_nome,
      signatario_cargo: d.signatario_cargo,
      destino: d.destino === "" ? null : d.destino,
    },
  });
  if (error || !id) return { ok: false, mensagem: msgBanco(error) };

  // Carta de transferência: opcionalmente marca o membro como transferido e registra no histórico.
  let aviso = "";
  if (d.marcar_transferido && d.membro_id !== "") {
    const { data: doc } = await supabase.from("documentos").select("numero").eq("id", id).maybeSingle();
    const { error: erroSituacao } = await supabase
      .from("membros")
      .update({ situacao: "transferido" })
      .eq("id", d.membro_id);
    const { error: erroHistorico } = await supabase.from("historico_participacao").insert({
      membro_id: d.membro_id,
      tipo: "transferencia",
      descricao: `Carta de transferência nº ${doc?.numero ?? ""}${d.destino ? ` para ${d.destino}` : ""}`.slice(0, 300),
      data: hojeBr(),
      criado_por: usuario.id,
    });
    if (erroSituacao || erroHistorico) {
      aviso = " Atenção: o documento foi emitido, mas a situação do membro não pôde ser atualizada; ajuste-a no cadastro.";
    }
  }

  revalidatePath("/secretaria", "layout");
  revalidatePath("/membros", "layout");
  return { ok: true, id: String(id), mensagem: `Documento emitido com sucesso.${aviso}` };
}

export async function anularDocumento(entrada: unknown): Promise<ResultadoAcao> {
  if (!(await secretaria())) return SEM_PERMISSAO;
  const analise = esquemaAnulacao.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, mensagem: analise.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = criarClienteServidor();
  const { error } = await supabase.rpc("anular_documento", {
    p_id: analise.data.id,
    p_motivo: analise.data.motivo,
  });
  if (error) return { ok: false, mensagem: msgBanco(error) };
  revalidatePath("/secretaria", "layout");
  return { ok: true, mensagem: "Documento anulado. Ele continua registrado, marcado como anulado." };
}
