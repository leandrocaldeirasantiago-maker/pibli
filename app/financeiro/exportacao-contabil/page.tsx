import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import PainelContabil from "./painel";
export const metadata = { title: "Exportação contábil — PIBLI" };
export default async function ExportacaoContabil() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.papel !== "administrador" && usuario.papel !== "tesoureiro") redirect("/financeiro");
  return <main className="mx-auto max-w-7xl space-y-6">
    <div className="space-y-2"><Link href="/financeiro" className="text-sm underline">← Voltar ao Financeiro</Link><h1 className="font-serif text-3xl font-semibold">Exportação contábil</h1><p className="text-sm text-muted-foreground">Preparação de Domínio, Nasajon e Alterdata — ambiente demonstrativo sem acesso a dados financeiros reais.</p></div>
    <div className="cartao border-l-4 border-amber-500 p-5" role="status"><h2 className="font-semibold">Modo seguro: somente demonstração</h2><p className="mt-1 text-sm">Sem gravação, migração, geração ou download de arquivos contábeis. Layouts pendentes de homologação.</p></div>
    <PainelContabil />
  </main>;
}
