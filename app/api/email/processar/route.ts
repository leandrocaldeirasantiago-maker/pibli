import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { criarProvedor } from "@/lib/email/provedor";
import { processarFila, type DependenciasFila } from "@/lib/email/processador";

// Chamada por um agendador (ex.: Vercel Cron, que envia "Authorization: Bearer $CRON_SECRET").
// O token é conferido DENTRO do banco (só o hash fica lá); esta rota usa a chave pública do Supabase.
// Responde apenas contagens, nunca endereços nem conteúdo.
export const dynamic = "force-dynamic";

const NOME_IGREJA = "Igreja Batista em Largo da Ideia";
const esquemaItem = z.object({
  id: z.number().int(),
  email: z.string(),
  nome: z.string(),
  assunto: z.string(),
  mensagem: z.string().nullable(),
  link: z.string().nullable(),
});

const json = (corpo: Record<string, unknown>, status = 200) => NextResponse.json(corpo, { status, headers: { "Cache-Control": "no-store" } });

async function processar(req: Request) {
  const token = /^Bearer (\S{32,200})$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token) return json({ erro: "Não autorizado." }, 401);

  // Em desenvolvimento, EMAIL_PROVEDOR=emulado grava os e-mails em .emails-emulados/caixa.jsonl em vez de enviar.
  const emulado = process.env.EMAIL_PROVEDOR === "emulado" ? (await import("@/lib/email/arquivo-emulado")).gravarEmArquivo : undefined;
  const provedor = criarProvedor(process.env, { aoGravar: emulado });
  if (!provedor) return json({ erro: "Envio de e-mail não configurado." }, 503);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const deps: DependenciasFila = {
    provedor,
    baseUrl: process.env.SITE_URL,
    nomeIgreja: NOME_IGREJA,
    async reservar(limite) {
      const { data, error } = await supabase.rpc("email_reservar", { p_token: token, p_limite: limite });
      if (error) return { ok: false, erro: error.message.includes("Não autorizado") ? "nao_autorizado" : "falha" };
      const itens = z.array(esquemaItem).safeParse(data ?? []);
      return itens.success ? { ok: true, itens: itens.data } : { ok: false, erro: "falha" };
    },
    async concluir(r) {
      await supabase.rpc("email_concluir", { p_token: token, p_id: r.id, p_ok: r.ok, p_permanente: r.permanente, p_erro: r.erro });
    },
    async limpar() {
      await supabase.rpc("email_limpar", { p_token: token });
    },
  };

  const r = await processarFila(deps);
  if (!r.ok) return r.erro === "nao_autorizado" ? json({ erro: "Não autorizado." }, 401) : json({ erro: "Falha ao processar a fila." }, 500);
  return json({ reservados: r.reservados, enviados: r.enviados, adiados: r.adiados, falhas: r.falhas });
}

export const GET = processar;
export const POST = processar;
