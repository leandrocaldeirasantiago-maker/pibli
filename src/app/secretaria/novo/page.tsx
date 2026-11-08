import Link from "next/link";
import { listarMembrosParaSelecao } from "@/lib/secretaria/consultas";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/secretaria/esquema";
import { FormularioDocumento } from "@/components/secretaria/documentos";

export const metadata = { title: "Emitir documento — Igreja Batista em Largo da Ideia" };

export default async function PaginaNovoDocumento({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const bruto = Array.isArray(searchParams.tipo) ? searchParams.tipo[0] : searchParams.tipo;
  const tipo = (TIPOS_DOCUMENTO.find(([v]) => v === bruto)?.[0] ?? "declaracao_membro") as TipoDocumento;
  const membros = await listarMembrosParaSelecao();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Emitir documento</h1>
          <p className="text-sm text-muted-foreground">Campos com * são obrigatórios. O documento recebe número e código automaticamente.</p>
        </div>
        <Link href="/secretaria" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">Voltar</Link>
      </div>
      <FormularioDocumento membros={membros} tipoInicial={tipo} />
    </div>
  );
}
