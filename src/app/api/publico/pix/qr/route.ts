import { NextResponse } from "next/server";
import { criarClienteAdministrador } from "@/lib/supabase/administrador";
import { gerarPayloadPix, gerarSvgQr } from "@/lib/pix/gerar";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { data, error } = await criarClienteAdministrador().from("configuracoes_igreja")
      .select("nome,pix_chave,pix_ativo").eq("id", true).maybeSingle();
    if (error || !data?.pix_ativo || !data.pix_chave) return NextResponse.json({ error: "Pix indisponível" }, { status: 404 });
    const svg = gerarSvgQr(gerarPayloadPix(data.pix_chave, data.nome ?? "IGREJA"));
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "QR indisponível" }, { status: 503 }); }
}
