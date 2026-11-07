import { MolduraAuth } from "@/components/auth/moldura-auth";
import { VerificarMfa } from "@/components/auth/mfa";

export const metadata = { title: "Confirmar código — Igreja Batista em Largo da Ideia" };

export default async function PaginaVerificarMfa({ searchParams: searchParamsPromessa }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await searchParamsPromessa;
  const proximo = Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next;
  return (
    <MolduraAuth titulo="Confirme sua identidade" descricao="Digite o código do aplicativo autenticador.">
      <VerificarMfa proximo={proximo} />
    </MolduraAuth>
  );
}
