import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase não configurado" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const hoje = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo"
    });

    const { data, error } = await supabase
      .from("avisos")
      .select("id,titulo,corpo,categoria,publicar_em,fixado")
      .eq("status", "publicado")
      .eq("publico_alvo", "todos")
      .lte("publicar_em", hoje)
      .or(`expira_em.is.null,expira_em.gte.${hoje}`)
      .order("fixado", { ascending: false })
      .order("publicar_em", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erro ao consultar avisos:", error.message);
      return NextResponse.json(
        { error: "Não foi possível consultar os avisos" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { avisos: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erro na API de avisos:", error);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
