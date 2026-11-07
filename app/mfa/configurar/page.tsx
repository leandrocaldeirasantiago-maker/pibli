import { MolduraAuth } from "@/components/auth/moldura-auth";
import { ConfigurarMfa } from "@/components/auth/mfa";

export const metadata = { title: "Cadastrar segundo fator — Igreja Batista em Largo da Ideia" };

export default async function PaginaConfigurarMfa({ searchParams: searchParamsPromessa }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await searchParamsPromessa;
  const proximo = Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next;
  return (
    <MolduraAuth titulo="Segundo fator de segurança" descricao="Proteja o acesso com um código gerado no seu celular.">
      <ConfigurarMfa proximo={proximo} />
    </MolduraAuth>
  );
}
