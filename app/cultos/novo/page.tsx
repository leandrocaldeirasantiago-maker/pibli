import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarMinisteriosAtivos, obterMeuMembroId } from "@/lib/cultos/consultas";
import { ministeriosQueLidera } from "@/lib/ministerios/consultas";
import { EVENTO_VAZIO } from "@/lib/cultos/esquema";
import { lerData } from "@/lib/datas";
import { hojeBr } from "@/lib/financeiro/periodo";
import { FormularioEvento } from "@/components/cultos/formulario-evento";

export const metadata = { title: "Novo evento — Igreja Batista em Largo da Ideia" };

export default async function PaginaNovoEvento({
  searchParams: searchParamsPromessa,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario || !["administrador", "pastor", "secretario", "lider_ministerio"].includes(usuario.papel)) redirect("/cultos");

  let ministerios = await listarMinisteriosAtivos();
  const ehLider = usuario.papel === "lider_ministerio";
  if (ehLider) {
    const meu = await obterMeuMembroId(usuario.id);
    const ids = meu ? await ministeriosQueLidera(meu) : [];
    ministerios = ministerios.filter((m) => ids.includes(m.id));
    if (ministerios.length === 0) {
      return (
        <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
          Você ainda não está definido(a) como líder de nenhum ministério. Procure a secretaria.
        </div>
      );
    }
  }

  const bruto = Array.isArray(searchParams.data) ? searchParams.data[0] : searchParams.data;
  const data = lerData(bruto, hojeBr());

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Novo evento</h1>
        <p className="text-sm text-muted-foreground">Campos com * são obrigatórios.{ehLider ? " Como líder, você cria eventos do ministério que lidera." : ""}</p>
      </div>
      <FormularioEvento inicial={EVENTO_VAZIO(data)} ministerios={ministerios} ministerioObrigatorio={ehLider} />
    </div>
  );
}
