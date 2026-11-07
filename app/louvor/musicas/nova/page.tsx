import { exigirGestorLouvor } from "@/lib/louvor/acesso";
import { MUSICA_VAZIA } from "@/lib/louvor/esquema";
import { FormularioMusica } from "@/components/louvor/formulario-musica";

export const metadata = { title: "Nova música — Igreja Batista em Largo da Ideia" };

export default async function PaginaNovaMusica() {
  await exigirGestorLouvor();
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Nova música</h1>
        <p className="text-sm text-muted-foreground">Músicas já cadastradas (mesmo com acento ou pontuação diferentes) são recusadas, para evitar duplicidade.</p>
      </div>
      <FormularioMusica inicial={MUSICA_VAZIA} />
    </div>
  );
}
