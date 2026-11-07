
import { NextResponse } from "next/server";
import { criarClienteAdministrador } from "@/lib/supabase/administrador";

export const dynamic = "force-dynamic";

export async function GET() {
  const chavePublica = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  let pix = { ativo: false, chave: "", nome: "" };
  try {
    const { data, error } = await criarClienteAdministrador().from("configuracoes_igreja")
      .select("nome,pix_chave,pix_ativo").eq("id", true).maybeSingle();
    if (!error && data?.pix_ativo && data.pix_chave) {
      pix = { ativo: true, chave: data.pix_chave, nome: data.nome ?? "" };
    }
  } catch { /* Mantém Pix indisponível sem configuração. */ }
  if (!chavePublica) {
    return NextResponse.json(
      { error: "Verificação de segurança indisponível" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { turnstileSiteKey: chavePublica, pix },
    { headers: { "Cache-Control": "no-store" } }
  );
}
