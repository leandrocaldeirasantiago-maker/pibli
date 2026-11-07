import { exigirGestorLouvor } from "@/lib/louvor/acesso";
import { listarEventos } from "@/lib/cultos/consultas";
import { dataLonga, formatarHora, somarDias } from "@/lib/datas";
import { hojeBr } from "@/lib/financeiro/periodo";
import { FormNovoRepertorio } from "@/components/louvor/acoes-louvor";

export const metadata = { title: "Novo repertório — Igreja Batista em Largo da Ideia" };

export default async function PaginaNovoRepertorio({ searchParams: searchParamsPromessa }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await searchParamsPromessa;
  await exigirGestorLouvor();
  const hoje = hojeBr();
  const eventos = (await listarEventos(hoje, somarDias(hoje, 60))).filter((e) => e.status === "agendado");
  const opcoes = eventos.map((e) => ({ id: e.id, rotulo: `${e.titulo} — ${dataLonga(e.data)}, ${formatarHora(e.hora_inicio)}` }));
  const pedido = Array.isArray(searchParams.evento) ? searchParams.evento[0] : searchParams.evento;
  const inicial = opcoes.some((o) => o.id === pedido) ? (pedido as string) : "";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Novo repertório</h1>
        <p className="text-sm text-muted-foreground">Cada evento tem no máximo um repertório ativo.</p>
      </div>
      <FormNovoRepertorio eventos={opcoes} eventoInicial={inicial} />
    </div>
  );
}
