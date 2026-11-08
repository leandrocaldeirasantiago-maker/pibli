import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarMinisteriosAtivos, obterMeuMembroId } from "@/lib/cultos/consultas";
import { ministeriosQueLidera } from "@/lib/ministerios/consultas";
import { AVISO_VAZIO } from "@/lib/comunicacao/esquema";
import { hojeBr } from "@/lib/financeiro/periodo";
import { FormularioAviso } from "@/components/comunicacao/formulario-aviso";

export const metadata = { title: "Novo aviso — Igreja Batista em Largo da Ideia" };

export default async function PaginaNovoAviso() {
  const usuario = await obterUsuarioAtual();
  if (!usuario || !["administrador", "pastor", "secretario", "lider_ministerio"].includes(usuario.papel)) redirect("/comunicacao");
  const ehLider = usuario.papel === "lider_ministerio";
  let ministerios = await listarMinisteriosAtivos();
  if (ehLider) {
    const meu = await obterMeuMembroId(usuario.id);
    const ids = meu ? await ministeriosQueLidera(meu) : [];
    ministerios = ministerios.filter((m) => ids.includes(m.id));
    if (ministerios.length === 0) {
      return <p className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">Você ainda não está definido(a) como líder de nenhum ministério. Procure a secretaria.</p>;
    }
  }
  const inicial = ehLider ? { ...AVISO_VAZIO(hojeBr()), publico_alvo: "ministerio" as const } : AVISO_VAZIO(hojeBr());
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Novo aviso</h1>
      <FormularioAviso inicial={inicial} ministerios={ministerios} somenteMinisterio={ehLider} />
    </div>
  );
}
