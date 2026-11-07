import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirParticipanteLouvor } from "@/lib/louvor/acesso";
import { lerFiltrosMusicas, listarMusicas } from "@/lib/louvor/consultas";
import { listarIdsFavoritas } from "@/lib/louvor/consultas-extra";
import { BotaoFavorita } from "@/components/louvor/botao-favorita";
import { LICENCAS, TONS } from "@/lib/louvor/esquema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Biblioteca de músicas — Igreja Batista em Largo da Ideia" };

export default async function PaginaMusicas({ searchParams: searchParamsPromessa }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await searchParamsPromessa;
  const { perfil } = await exigirParticipanteLouvor();
  const f = lerFiltrosMusicas(searchParams);
  const somenteFavoritas = (Array.isArray(searchParams.favoritas) ? searchParams.favoritas[0] : searchParams.favoritas) === "1";
  const [todas, favoritas] = await Promise.all([listarMusicas(f), listarIdsFavoritas()]);
  const musicas = somenteFavoritas ? todas.filter((m) => favoritas.has(m.id)) : todas;
  const rotuloLicenca = Object.fromEntries(LICENCAS.map(([v]) => [v, { nenhuma: "Sem autorização", dominio_publico: "Domínio público", autoral: "Autoral/autorizada", licenciada: "Licenciada" }[v]]));
  const campo = "h-10 rounded-xl border border-border bg-background px-3 text-sm";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Biblioteca de músicas</h1>
          <p className="text-sm text-muted-foreground">{musicas.length} música(s){f.inativas ? " (inclui inativas)" : ""}.</p>
        </div>
        {perfil.gere && (
          <Link href="/louvor/musicas/nova" className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900">
            <Plus className="h-4 w-4" /> Nova música
          </Link>
        )}
      </div>

      <form className="cartao flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="block text-sm"><span className="mb-1 block">Buscar</span><input name="q" defaultValue={f.q} placeholder="Título ou artista" className={`${campo} w-56`} /></label>
        <label className="block text-sm"><span className="mb-1 block">Tom</span>
          <select name="tom" defaultValue={f.tom} className={campo}><option value="">Todos</option>{TONS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </label>
        <label className="block text-sm"><span className="mb-1 block">Etiqueta</span><input name="tag" defaultValue={f.tag} className={`${campo} w-36`} /></label>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="favoritas" value="1" defaultChecked={somenteFavoritas} /> Só favoritas</label>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="inativas" value="1" defaultChecked={f.inativas} /> Mostrar inativas</label>
        <button type="submit" className="h-10 rounded-xl border border-border px-4 text-sm hover:bg-muted">Filtrar</button>
        <Link href="/louvor/musicas" className="pb-2 text-sm underline">Limpar</Link>
      </form>

      <div className="cartao overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 p-3"><span className="sr-only">Favorita</span></th><th className="p-3">Música</th><th className="p-3">Tom</th><th className="p-3">BPM</th><th className="p-3">Autorização</th><th className="p-3">Etiquetas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {musicas.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground">Nenhuma música encontrada.</td></tr>}
            {musicas.map((m) => (
              <tr key={m.id} className={cn(!m.ativo && "opacity-60")}>
                <td className="p-1"><BotaoFavorita musicaId={m.id} titulo={m.titulo} favorita={favoritas.has(m.id)} /></td>
                <td className="p-3"><Link href={`/louvor/musicas/${m.id}`} className="font-medium hover:underline">{m.titulo}</Link>{m.artista && <span className="block text-xs text-muted-foreground">{m.artista}</span>}{!m.ativo && <span className="text-xs text-amber-700"> Inativa</span>}</td>
                <td className="p-3">{m.tom_original ?? "—"}</td>
                <td className="p-3">{m.bpm ?? "—"}</td>
                <td className="p-3">{rotuloLicenca[m.licenca]}</td>
                <td className="p-3 text-xs text-muted-foreground">{m.tags.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
