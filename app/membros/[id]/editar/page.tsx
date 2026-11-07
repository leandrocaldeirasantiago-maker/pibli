import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { listarMinisterios, obterMembroCompleto } from "@/lib/membros/consultas";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { MEMBRO_VAZIO, type DadosMembro } from "@/lib/membros/esquema";
import { FormularioMembro } from "@/components/membros/formulario-membro";

export const metadata = { title: "Editar membro — Igreja Batista em Largo da Ideia" };

export default async function PaginaEditarMembro({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const usuario = await obterUsuarioAtual();
  if (!usuario || !PAPEIS_GESTAO.includes(usuario.papel)) redirect("/membros");

  const [completo, ministerios] = await Promise.all([
    obterMembroCompleto(params.id),
    listarMinisterios(),
  ]);
  if (!completo) notFound();
  const m = completo.membro;

  const inicial: DadosMembro = {
    ...MEMBRO_VAZIO,
    nome_completo: m.nome_completo ?? "",
    data_nascimento: m.data_nascimento ?? "",
    telefone: m.telefone ?? "",
    whatsapp: m.whatsapp ?? "",
    cep: m.cep ?? "",
    logradouro: m.logradouro ?? "",
    numero: m.numero ?? "",
    complemento: m.complemento ?? "",
    bairro: m.bairro ?? "",
    cidade: m.cidade ?? "",
    uf: m.uf ?? "",
    data_batismo: m.data_batismo ?? "",
    data_ingresso: m.data_ingresso ?? "",
    estado_civil: m.estado_civil ?? "",
    situacao: m.situacao,
    familia_nome: m.familias?.nome ?? "",
    parentesco: m.parentesco ?? "",
    ministerios: completo.ministerios.map((x) => x.id),
    observacoes: m.observacoes ?? "",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Editar membro</h1>
      <FormularioMembro
        ministerios={ministerios}
        inicial={inicial}
        membroId={params.id}
        fotoAtualUrl={completo.fotoUrl}
      />
    </div>
  );
}
