import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { caminhoInternoSeguro } from "@/lib/validacao";

/** Troca o código enviado por e-mail (recuperação de senha) por uma sessão. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const codigo = searchParams.get("code");
  // Evita redirecionamento aberto: só caminhos internos
  const destino = caminhoInternoSeguro(searchParams.get("next"));

  if (codigo) {
    const supabase = criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
