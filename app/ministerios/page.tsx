import Link from "next/link";
import { Users } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarResumoMinisterios, ministeriosQueLidera } from "@/lib/ministerios/consultas";
import { obterMeuMembroId } from "@/lib/cultos/consultas";
import { FormMinisterio } from "@/components/ministerios/gestao";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ministérios — Igreja Batista em Largo da Ideia" };

export default async function PaginaMinisterios() {
  const usuario = await obterUsuarioAtual();
  const papel = usuario?.papel;
  const gestao = papel === "administrador" || papel === "pastor";
  const ehLider = papel === "lider_ministerio";

  let ministerios = await listarResumoMinisterios();
  let semVinculo = false;
  if (ehLider && usuario) {
    const meu = await obterMeuMembroId(usuario.id);
    if (!meu) {
      semVinculo = true;
      ministerios = [];
    } else {
      const ids = await ministeriosQueLidera(meu);
      ministerios = ministerios.filter((m) => ids.includes(m.id));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Ministérios</h1>
        <p className="text-sm text-muted-foreground">
          {ehLider ? "Os ministérios que você lidera." : "Equipes de serviço da igreja e seus participantes."}
        </p>
      </div>

      {semVinculo && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Seu usuário ainda não está vinculado a um cadastro de membro, por isso não é possível identificar os ministérios que você lidera. Procure a secretaria.
        </p>
      )}

      {gestao && (
        <section className="cartao p-5">
          <h2 className="titulo-secao mb-3">Novo ministério</h2>
          <FormMinisterio />
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Lista de ministérios">
        {ministerios.length === 0 && !semVinculo && (
          <p className="text-sm text-muted-foreground">Nenhum ministério cadastrado.</p>
        )}
        {ministerios.map((m) => (
          <Link
            key={m.id}
            href={`/ministerios/${m.id}`}
            className={cn("cartao block p-5 transition-colors hover:bg-muted", !m.ativo && "opacity-70")}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif text-lg font-semibold">{m.nome}</h3>
              {!m.ativo && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">inativo</span>}
            </div>
            {m.descricao && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.descricao}</p>}
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-dourado" /> {m.total} {m.total === 1 ? "participante ativo" : "participantes ativos"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Liderança: {m.lideres ?? "não definida"}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
