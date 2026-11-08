
import { NextResponse } from "next/server";
import { obterModeradorOracoes } from "@/lib/autorizacao-oracoes";
import { criarClienteAdministrador } from "@/lib/supabase/administrador";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const moderador = await obterModeradorOracoes();

    if (!moderador) {
      return NextResponse.json(
        { error: "Acesso não autorizado" },
        { status: 403 }
      );
    }

    const supabase = criarClienteAdministrador();

    const { data, error } = await supabase
      .from("pedidos_oracao_visitantes")
      .select(
        "id, nome, categoria, texto, visibilidade, status, criado_em"
      )
      .in("status", ["pendente", "aprovado"])
      .order("criado_em", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Erro ao consultar orações:", error.message);

      return NextResponse.json(
        { error: "Não foi possível consultar os pedidos" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { pedidos: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erro na API administrativa de orações:", error);

    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const moderador = await obterModeradorOracoes();

    if (!moderador) {
      return NextResponse.json(
        { error: "Acesso não autorizado" },
        { status: 403 }
      );
    }

    // Bloqueia alterações originadas de outros sites.
    const origem = request.headers.get("origin");
    const destino = new URL(request.url);

    if (
      !origem ||
      origem !== destino.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return NextResponse.json(
        { error: "Origem não autorizada" },
        { status: 403 }
      );
    }

    if (
      !request.headers.get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return NextResponse.json(
        { error: "Formato inválido" },
        { status: 415 }
      );
    }

    const corpo = await request.text();

    if (corpo.length > 2048) {
      return NextResponse.json(
        { error: "Solicitação muito grande" },
        { status: 413 }
      );
    }

    let dados: unknown;

    try {
      dados = JSON.parse(corpo);
    } catch {
      return NextResponse.json(
        { error: "JSON inválido" },
        { status: 400 }
      );
    }

    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const { id, acao } = dados as Record<string, unknown>;

    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      (acao !== "aprovar" &&
        acao !== "rejeitar" &&
        acao !== "ocultar")
    ) {
      return NextResponse.json(
        { error: "Pedido ou ação inválida" },
        { status: 400 }
      );
    }

    const supabase = criarClienteAdministrador();

    const novoStatus =
      acao === "aprovar"
        ? "aprovado"
        : acao === "rejeitar"
          ? "rejeitado"
          : "oculto";

    const agora = new Date().toISOString();

    const atualizacao: {
      status: string;
      atualizado_em: string;
      aprovado_em?: string | null;
    } = {
      status: novoStatus,
      atualizado_em: agora,
    };

    if (acao === "aprovar") {
      atualizacao.aprovado_em = agora;
    } else {
      atualizacao.aprovado_em = null;
    }

    let consulta = supabase
      .from("pedidos_oracao_visitantes")
      .update(atualizacao)
      .eq("id", id);

    if (acao === "aprovar") {
      // Somente pedidos para o mural podem ser publicados.
      consulta = consulta
        .eq("visibilidade", "mural")
        .eq("status", "pendente");
    } else if (acao === "rejeitar") {
      consulta = consulta.eq("status", "pendente");
    } else {
      consulta = consulta.eq("status", "aprovado");
    }

    const { data, error } = await consulta
      .select("id, status")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Falha ao atualizar o pedido" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Pedido não encontrado ou ação não permitida" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { sucesso: true, status: data.status },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
