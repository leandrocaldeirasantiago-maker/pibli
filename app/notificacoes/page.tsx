import Link from "next/link";
import { listarNotificacoes } from "@/lib/cultos/consultas";
import { formatarDataBr } from "@/lib/membros/esquema";
import { BotaoMarcarLidas } from "@/components/cultos/acoes-notificacoes";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notificações — Igreja Batista em Largo da Ideia" };

const quando = (iso: string) => {
  const d = new Date(iso);
  const data = formatarDataBr(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d));
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(d);
  return `${data} às ${hora}`;
};

export default async function PaginaNotificacoes() {
  const notificacoes = await listarNotificacoes(50);
  const naoLidas = notificacoes.filter((n) => !n.lida);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {naoLidas.length === 0 ? "Você está em dia." : `${naoLidas.length} não lida(s).`}
          </p>
        </div>
        {naoLidas.length > 0 && <BotaoMarcarLidas rotulo="Marcar todas como lidas" />}
      </div>

      <ul className="space-y-2">
        {notificacoes.length === 0 && <li className="cartao p-5 text-sm text-muted-foreground">Nenhuma notificação até agora.</li>}
        {notificacoes.map((n) => (
          <li key={n.id} className={cn("cartao flex flex-wrap items-start justify-between gap-3 p-4", !n.lida && "border-dourado")}>
            <div className="min-w-0">
              <p className={cn("text-sm", !n.lida && "font-semibold")}>
                {!n.lida && <span aria-label="não lida" className="mr-2 inline-block h-2 w-2 rounded-full bg-dourado" />}
                {n.titulo}
              </p>
              {n.mensagem && <p className="mt-0.5 text-sm text-muted-foreground">{n.mensagem}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{quando(n.criado_em)}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {n.link && <Link href={n.link} className="underline">Abrir</Link>}
              {!n.lida && <BotaoMarcarLidas ids={[n.id]} rotulo="Marcar como lida" />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
