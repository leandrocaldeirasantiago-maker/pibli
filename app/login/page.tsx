"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaLogin, traduzirErroAuth, type DadosLogin } from "@/lib/validacao";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { MolduraAuth, classeBotao, classeCampo } from "@/components/auth/moldura-auth";

const AVISOS: Record<string, string> = {
  inativo: "Seu acesso está desativado. Procure a secretaria da igreja.",
  "link-invalido": "O link expirou ou é inválido. Solicite um novo.",
};

function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const avisoUrl = AVISOS[params.get("erro") ?? ""];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosLogin>({ resolver: zodResolver(esquemaLogin) });

  async function aoEnviar(dados: DadosLogin) {
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: dados.email,
      password: dados.senha,
    });
    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <MolduraAuth titulo="Entrar" descricao="Acesse o sistema de gestão da igreja.">
      <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
        {(erro || avisoUrl) && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
            {erro ?? avisoUrl}
          </p>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
          <input id="email" type="email" autoComplete="email" className={classeCampo} {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-medium">Senha</label>
          <input id="senha" type="password" autoComplete="current-password" className={classeCampo} {...register("senha")} />
          {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className={classeBotao}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>
        <p className="text-center text-sm">
          <Link href="/recuperar-senha" className="text-dourado-600 underline">
            Esqueci minha senha
          </Link>
        </p>
      </form>
    </MolduraAuth>
  );
}

export default function PaginaLogin() {
  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  );
}
