"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { paraLinhaMembro } from "@/lib/membros/esquema";
import { LIMITE_BYTES_IMPORTACAO, analisarCsv, chaveDuplicidade } from "@/lib/membros/importacao";

export type LinhaPrevia = { linha: number; nome: string; situacao: "novo" | "ja_cadastrado" | "erro"; detalhe: string };
export type ResultadoImportacao = {
  ok: boolean;
  mensagem: string;
  previa?: { linhas: LinhaPrevia[]; novos: number; jaCadastrados: number; comErro: number; colunasIgnoradas: string[] };
  importados?: number;
};

// Resultado discriminado por `erro`: com erro, devolve a resposta pronta; sem erro, traz o que o passo seguinte precisa.
type Leitura =
  | { erro: ResultadoImportacao }
  | {
      erro?: undefined;
      usuario: NonNullable<Awaited<ReturnType<typeof obterUsuarioAtual>>>;
      supabase: ReturnType<typeof criarClienteServidor>;
      leitura: ReturnType<typeof analisarCsv>;
      existentes: Set<string>;
    };

async function ler(formData: FormData): Promise<Leitura> {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !PAPEIS_GESTAO.includes(usuario.papel)) {
    return { erro: { ok: false, mensagem: "Você não tem permissão para importar membros." } satisfies ResultadoImportacao };
  }
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: { ok: false, mensagem: "Escolha um arquivo CSV." } satisfies ResultadoImportacao };
  if (arquivo.size > LIMITE_BYTES_IMPORTACAO) return { erro: { ok: false, mensagem: "O arquivo deve ter no máximo 512 KB." } satisfies ResultadoImportacao };
  if (!/\.csv$/i.test(arquivo.name)) return { erro: { ok: false, mensagem: "Envie um arquivo .csv (na planilha: Salvar como CSV)." } satisfies ResultadoImportacao };

  const leitura = analisarCsv(await arquivo.text());
  if (leitura.erroGeral) return { erro: { ok: false, mensagem: leitura.erroGeral } satisfies ResultadoImportacao };

  // Compara com quem já está cadastrado (mesmo nome, sem acento/caixa, e mesmo nascimento).
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.from("membros").select("nome_completo, data_nascimento").limit(20000);
  if (error) return { erro: { ok: false, mensagem: "Não foi possível consultar os membros atuais. Tente novamente." } satisfies ResultadoImportacao };
  const existentes = new Set<string>((data ?? []).map((m) => chaveDuplicidade(m.nome_completo as string, (m.data_nascimento as string | null) ?? null)));
  return { usuario, supabase, leitura, existentes };
}

/** Passo 1: mostra o que aconteceria, sem gravar nada. */
export async function preverImportacao(formData: FormData): Promise<ResultadoImportacao> {
  const r = await ler(formData);
  if (r.erro) return r.erro;
  const { leitura, existentes } = r;
  const linhas: LinhaPrevia[] = leitura.linhas.map((l) => {
    if (l.erros.length > 0 || !l.dados) return { linha: l.linha, nome: l.dados?.nome_completo ?? "", situacao: "erro", detalhe: l.erros.join(" ") };
    if (existentes.has(l.chave!)) return { linha: l.linha, nome: l.dados.nome_completo, situacao: "ja_cadastrado", detalhe: "Já existe um membro com este nome e nascimento; será ignorado." };
    return { linha: l.linha, nome: l.dados.nome_completo, situacao: "novo", detalhe: "" };
  });
  const n = (s: LinhaPrevia["situacao"]) => linhas.filter((x) => x.situacao === s).length;
  return {
    ok: true,
    mensagem: "Confira a prévia. Nada foi gravado ainda.",
    previa: { linhas, novos: n("novo"), jaCadastrados: n("ja_cadastrado"), comErro: n("erro"), colunasIgnoradas: leitura.colunasIgnoradas },
  };
}

/** Passo 2: regrava a leitura no servidor (não confia na prévia do navegador) e insere só as linhas válidas e novas, em uma única operação. */
export async function importarMembros(formData: FormData): Promise<ResultadoImportacao> {
  const r = await ler(formData);
  if (r.erro) return r.erro;
  const { usuario, supabase, leitura, existentes } = r;
  const novos = leitura.linhas.filter((l) => l.erros.length === 0 && l.dados && !existentes.has(l.chave!));
  if (novos.length === 0) return { ok: false, mensagem: "Nenhuma linha nova e válida para importar." };

  const { error } = await supabase.from("membros").insert(novos.map((l) => ({ ...paraLinhaMembro(l.dados!), criado_por: usuario.id })));
  if (error) return { ok: false, mensagem: "Não foi possível importar. Nenhum membro foi gravado; confira o arquivo e tente de novo." };

  // Auditoria (LGPD): só quantidades, nunca o conteúdo.
  // Os membros já foram gravados; se só a auditoria falhar, a importação continua valendo, mas o aviso diz isso.
  const { error: erroAuditoria } = await supabase.rpc("registrar_evento", {
    p_acao: "importacao_membros",
    p_detalhes: { importados: novos.length, ignorados: leitura.linhas.length - novos.length },
  });
  revalidatePath("/membros");
  return {
    ok: true,
    mensagem: `${novos.length} membro(s) importado(s).` + (erroAuditoria ? " Atenção: não foi possível registrar a importação na auditoria; avise o administrador." : ""),
    importados: novos.length,
  };
}
