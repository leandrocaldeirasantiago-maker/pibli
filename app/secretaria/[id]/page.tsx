import Link from "next/link";
import { notFound } from "next/navigation";
import { obterDocumento } from "@/lib/secretaria/consultas";
import { TIPOS_DOCUMENTO } from "@/lib/secretaria/esquema";
import { IGREJA_NOME } from "@/lib/secretaria/modelos";
import { dataPorExtenso } from "@/lib/datas";
import { formatarDataBr } from "@/lib/membros/esquema";
import { BotaoAnularDocumento } from "@/components/secretaria/documentos";
import { BotaoImprimir } from "@/components/financeiro/acoes-lancamento";

export const metadata = { title: "Documento — Igreja Batista em Largo da Ideia" };

const dataBrIso = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

export default async function PaginaDocumento({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const doc = await obterDocumento(params.id);
  if (!doc) notFound();

  const rotulo = TIPOS_DOCUMENTO.find(([v]) => v === doc.tipo)?.[1] ?? doc.tipo;
  const dataEmissao = dataBrIso(doc.emitido_em);
  const paragrafos = doc.conteudo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const anulado = !!doc.anulado_em;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="font-serif text-2xl font-semibold">{rotulo} nº {doc.numero}</h1>
        <div className="flex flex-wrap items-start gap-2">
          <Link href="/secretaria" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar</Link>
          {!anulado && <BotaoImprimir />}
          {!anulado && <BotaoAnularDocumento id={doc.id} numero={doc.numero} />}
        </div>
      </div>

      {anulado && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <strong>DOCUMENTO ANULADO</strong> em {formatarDataBr(dataBrIso(doc.anulado_em!))}. Motivo: {doc.motivo_anulacao}. Este documento não tem validade.
        </p>
      )}

      <article className="relative rounded-2xl border border-border bg-white p-10 text-black shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {anulado && (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-bold uppercase tracking-widest text-red-600/20 [transform:rotate(-30deg)]">
            Anulado
          </span>
        )}
        <header className="border-b-2 border-[#D5AD60] pb-4 text-center">
          <p className="font-serif text-xl font-semibold text-[#142C4D]">{IGREJA_NOME}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-neutral-600">Documento nº {doc.numero}</p>
        </header>

        <h2 className="mt-8 text-center font-serif text-2xl font-semibold uppercase tracking-wide text-[#142C4D]">{doc.titulo}</h2>

        <div className="mt-8 space-y-4 text-justify text-[15px] leading-relaxed">
          {paragrafos.map((p, i) => (
            <p key={i} className="whitespace-pre-line">{p}</p>
          ))}
        </div>

        <p className="mt-10 text-right text-sm">
          {doc.dados?.local ? `${doc.dados.local}, ` : ""}{dataPorExtenso(dataEmissao)}.
        </p>

        <div className="mt-16 flex justify-center">
          <div className="w-72 border-t border-black pt-2 text-center text-sm">
            <p className="font-medium">{doc.dados?.signatario_nome}</p>
            <p className="text-neutral-700">{doc.dados?.signatario_cargo}</p>
          </div>
        </div>

        <footer className="mt-12 border-t border-neutral-300 pt-3 text-center text-[11px] text-neutral-600">
          Documento nº {doc.numero} · Código de controle {doc.codigo}. Para conferir a autenticidade, acesse o endereço do sistema da igreja em /verificar e informe o número e o código, ou procure a secretaria.
        </footer>
      </article>

      <p className="text-xs text-muted-foreground print:hidden">
        Emitido em {formatarDataBr(dataEmissao)}{doc.emissor ? ` por ${doc.emissor}` : ""}. O texto emitido não pode ser alterado.
      </p>
    </div>
  );
}
