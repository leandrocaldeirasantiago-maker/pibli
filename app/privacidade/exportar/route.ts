import { NextResponse } from "next/server";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/** LGPD: cada usuário baixa os próprios dados (o banco só devolve o que a pessoa já pode ver). */
export async function POST() {
  if (!(await obterUsuarioAtual())) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  const supabase = criarClienteServidor();
  const { data, error } = await supabase.rpc("exportar_meus_dados");
  if (error || !data) return NextResponse.json({ erro: "Não foi possível gerar o arquivo." }, { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados.json"',
      "Cache-Control": "no-store",
    },
  });
}
