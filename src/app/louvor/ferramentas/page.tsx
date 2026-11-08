import { Metronomo } from "@/components/louvor/metronomo";
import { Afinador } from "@/components/louvor/afinador";

export const metadata = { title: "Metrônomo e afinador — Igreja Batista em Largo da Ideia" };

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PaginaFerramentas({ searchParams: searchParamsPromessa }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await searchParamsPromessa;
  const bpm = Number.parseInt(primeiro(searchParams.bpm) ?? "", 10);
  const compasso = primeiro(searchParams.compasso) ?? "4/4";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Metrônomo e afinador</h1>
        <p className="text-sm text-muted-foreground">Ferramentas para ensaio, disponíveis a qualquer usuário. Funcionam no navegador, sem enviar nada ao servidor.</p>
      </div>
      <Metronomo bpmInicial={Number.isFinite(bpm) ? bpm : 90} compassoInicial={compasso} />
      <Afinador />
    </div>
  );
}
