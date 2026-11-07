import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { ImportarMembros } from "@/components/membros/importar-membros";
import { MODELO_CSV } from "@/lib/membros/importacao";

export const metadata = { title: "Importar membros — Igreja Batista em Largo da Ideia" };

export default async function PaginaImportar() {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !PAPEIS_GESTAO.includes(usuario.papel)) redirect("/membros");
  const modelo = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + MODELO_CSV);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Importar membros</h1>
          <p className="text-sm text-muted-foreground">Carga inicial a partir de uma planilha salva como CSV.</p>
        </div>
        <Link href="/membros" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar aos membros</Link>
      </div>
      <section className="cartao space-y-2 p-5 text-sm">
        <p>Colunas aceitas: Nome (obrigatória), Nascimento, Telefone, WhatsApp, CEP, Logradouro, Numero, Complemento, Bairro, Cidade, UF, Batismo, Ingresso, Estado civil, Situacao e Observacoes. Datas como 31/12/1990. Separador ; ou ,.</p>
        <p>Até 500 linhas e 512 KB por arquivo. Quem já existe (mesmo nome e nascimento) é ignorado. A prévia não grava nada.</p>
        <p className="text-muted-foreground">Dados pessoais: importe só o necessário e apague o arquivo do computador depois. A importação fica registrada na auditoria (apenas as quantidades).</p>
        <a href={modelo} download="modelo-importacao-membros.csv" className="inline-block underline">Baixar modelo</a>
      </section>
      <ImportarMembros />
    </div>
  );
}
