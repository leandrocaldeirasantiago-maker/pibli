"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaRecuperar, type DadosRecuperar } from "@/lib/validacao";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { MolduraAuth, classeBotao, classeCampo } from "@/components/auth/moldura-auth";

export default function PaginaRecuperarSenha() {
  const [enviado, setEnviado] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosRecuperar>({ resolver: zodResolver(esquemaRecuperar) });

  async function aoEnviar(dados: DadosRecuperar) {
    const supabase = criarClienteNavegador();
    // A resposta é a mesma exista ou não o e-mail, para não revelar cadastros.
    await supabase.auth.resetPasswordForEmail(dados.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setEnviado(true);
  }

  return (
    <MolduraAuth titulo="Recuperar senha" descricao="Enviaremos um link para o seu e-mail.">
      {enviado ? (
        <p role="status" className="rounded-xl bg-muted p-4 text-sm">
          Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.
        </p>
      ) : (
        <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
            <input id="email" type="email" autoComplete="email" className={classeCampo} {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className={classeBotao}>
            {isSubmitting ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-dourado-600 underline">Voltar ao login</Link>
      </p>
    </MolduraAuth>
  );
}
