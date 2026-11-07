import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { formatarDataBr, formatarTelefone } from "@/lib/membros/esquema";
import { FormularioVisitante } from "@/components/membros/formulario-visitante";

export const metadata = { title: "Visitantes — Igreja Batista em Largo da Ideia" };

export default async function PaginaVisitantes() {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !PAPEIS_GESTAO.includes(usuario.papel)) redirect("/membros");

  const supabase = criarClienteServidor();
  const { data } = await supabase
    .from("visitantes")
    .select("id, nome, telefone, data_visita, observacao")
    .order("data_visita", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(100);
  const visitantes = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Visitantes</h1>
          <p className="text-sm text-muted-foreground">Últimos 100 registros.</p>
        </div>
        <Link href="/membros" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">
          Voltar aos membros
        </Link>
      </div>

      <FormularioVisitante />

      <div className="cartao overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visitantes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum visitante registrado.
                </td>
              </tr>
            )}
            {visitantes.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 text-muted-foreground">{formatarDataBr(v.data_visita)}</td>
                <td className="px-4 py-3 font-medium">{v.nome}</td>
                <td className="px-4 py-3">{formatarTelefone(v.telefone) || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.observacao ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
