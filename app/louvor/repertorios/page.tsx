import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirParticipanteLouvor } from "@/lib/louvor/acesso";
import { listarRepertorios } from "@/lib/louvor/consultas";
import { STATUS_REPERTORIO } from "@/lib/louvor/esquema";
import { formatarDataBr } from "@/lib/membros/esquema";

export const metadata = { title: "Repertórios — Igreja Batista em Largo da Ideia" };

export default async function PaginaRepertorios({ searchParams: searchParamsPromessa }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await searchParamsPromessa;
  const { perfil } = await exigirParticipanteLouvor();
  const arquivados = (Array.isArray(searchParams.arquivados) ? searchParams.arquivados[0] : searchParams.arquivados) === "1";
  const lista = await listarRepertorios(arquivados);
  const rotulo = Object.fromEntries(STATUS_REPERTORIO);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Repertórios</h1>
          <Link href={arquivados ? "/louvor/repertorios" : "?arquivados=1"} className="text-sm underline">{arquivados ? "Ocultar arquivados" : "Mostrar arquivados"}</Link>
        </div>
        {perfil.gere && (
          <Link href="/louvor/repertorios/novo" className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900"><Plus className="h-4 w-4" /> Novo repertório</Link>
        )}
      </div>
      <ul className="space-y-2">
        {lista.length === 0 && <li className="cartao p-5 text-sm text-muted-foreground">Nenhum repertório.</li>}
        {lista.map((r) => (
          <li key={r.id} className="cartao flex flex-wrap items-center justify-between gap-2 p-4">
            <span>
              <Link href={`/louvor/repertorios/${r.id}`} className="font-medium hover:underline">{r.titulo}</Link>
              <span className="block text-xs text-muted-foreground">
                {r.evento_titulo ? `${r.evento_titulo} · ${r.evento_data ? formatarDataBr(r.evento_data) : ""}` : "Sem evento"} · {r.total} música(s)
              </span>
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{rotulo[r.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
