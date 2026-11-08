"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { esquemaNovaSenha, traduzirErroAuth, type DadosNovaSenha } from "@/lib/validacao";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { MolduraAuth, classeBotao, classeCampo } from "@/components/auth/moldura-auth";

export default function PaginaRedefinirSenha() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosNovaSenha>({ resolver: zodResolver(esquemaNovaSenha) });

  async function aoEnviar(dados: DadosNovaSenha) {
    setErro(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: dados.senha });
    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }
    setSucesso(true);
    setTimeout(() => router.replace("/"), 1500);
  }

  return (
    <MolduraAuth titulo="Nova senha" descricao="Escolha uma senha forte para a sua conta.">
      {sucesso ? (
        <p role="status" className="rounded-xl bg-muted p-4 text-sm">
          Senha alterada com sucesso. Redirecionando…
        </p>
      ) : (
        <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4" noValidate>
          {erro && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
              {erro}
            </p>
          )}
          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium">Nova senha</label>
            <input id="senha" type="password" autoComplete="new-password" className={classeCampo} {...register("senha")} />
            {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmar" className="mb-1 block text-sm font-medium">Confirmar senha</label>
            <input id="confirmar" type="password" autoComplete="new-password" className={classeCampo} {...register("confirmar")} />
            {errors.confirmar && <p className="mt-1 text-xs text-red-600">{errors.confirmar.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className={classeBotao}>
            {isSubmitting ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      )}
    </MolduraAuth>
  );
}
