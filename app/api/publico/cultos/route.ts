import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const hoje = new Date();
    const inicio = new Date(
      hoje.getTime() - hoje.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("eventos")
      .select("id,titulo,tipo,data,hora_inicio,local,status")
      .eq("publico", true)
      .neq("status", "cancelado")
      .gte("data", inicio)
      .order("data", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .limit(30);

    if (error) {
      console.error("Erro na consulta publica de cultos:", error.message);
      return NextResponse.json(
        { erro: "Não foi possível consultar os cultos." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { eventos: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { erro: "Erro interno ao consultar os cultos." },
      { status: 500 }
    );
  }
}
