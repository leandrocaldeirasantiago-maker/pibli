import { Download } from "lucide-react";
import { criarClienteServidor, obterUsuarioAtual } from "@/lib/supabase/servidor";
import { PreferenciaEmail } from "@/components/privacidade/preferencia-email";
import { obterConfiguracoes } from "@/lib/configuracoes/consultas";
import { emailSeguro } from "@/lib/configuracoes/esquema";

export const metadata = { title: "Privacidade e dados — Igreja Batista em Largo da Ideia" };

export default async function PaginaPrivacidade() {
  const usuario = await obterUsuarioAtual();
  const igreja = await obterConfiguracoes().catch(() => null);
  let emailAtivo = false;
  if (usuario) {
    const { data } = await criarClienteServidor().from("preferencias_email").select("ativo").maybeSingle();
    emailAtivo = (data as { ativo: boolean } | null)?.ativo === true;
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold lg:text-3xl">Privacidade e seus dados</h1>
        <p className="text-sm text-muted-foreground">Como a igreja trata os seus dados pessoais (LGPD, Lei 13.709/2018).</p>
      </div>

      <section className="cartao space-y-2 p-5 text-sm">
        <h2 className="titulo-secao">O que guardamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dados de cadastro de membro: nome, contato, data de nascimento, família, ministérios, batismo e histórico de participação.</li>
          <li>Participação em cultos e eventos: escalas, inscrições e presenças.</li>
          <li>Pedidos de oração que você mesmo(a) enviar.</li>
          <li>Se for o caso, contribuições financeiras identificadas (como o dízimo registrado em seu nome). A <strong>tesouraria</strong> é a responsável por esse registro: só o administrador e o tesoureiro o veem. O pastor, a secretaria e os líderes enxergam apenas totais, nunca quem contribuiu. Você pode pedir à tesouraria o extrato das suas contribuições ou que o vínculo com o seu nome deixe de ser feito.</li>
        </ul>
        <p>Informações sobre a vida religiosa são dados pessoais sensíveis. Por isso o acesso é limitado por função e as alterações importantes ficam registradas.</p>
        <p>Os dados são usados só para a vida e a administração da igreja, não são vendidos e não são compartilhados com terceiros para fins comerciais.</p>
      </section>

      <section className="cartao space-y-2 p-5 text-sm">
        <h2 className="titulo-secao">Quem responde pelos seus dados</h2>
        {igreja?.encarregado_nome ? (
          <p>
            Encarregado(a) pelo tratamento de dados pessoais: <strong>{igreja.encarregado_nome}</strong>
            {igreja.encarregado_email && (emailSeguro(igreja.encarregado_email) ? (<>, <a className="underline" href={`mailto:${igreja.encarregado_email}`}>{igreja.encarregado_email}</a></>) : <>, {igreja.encarregado_email}</>)}.
            Procure essa pessoa para pedidos sobre os seus dados.
          </p>
        ) : (
          <p>A igreja ainda não indicou o(a) encarregado(a). Enquanto isso, procure a secretaria (cadastro) ou a tesouraria (contribuições).</p>
        )}
      </section>

      {usuario && (
        <section className="cartao space-y-2 p-5 text-sm">
          <h2 className="titulo-secao">Avisos por e-mail</h2>
          <PreferenciaEmail ativo={emailAtivo} email={usuario.email} />
          <p className="text-xs text-muted-foreground">Só enviamos se você ativar. O e-mail repete o texto do aviso interno (por exemplo, o evento e o horário) e usa um serviço de envio contratado pela igreja. Cópias enviadas são apagadas da fila em até 30 dias.</p>
        </section>
      )}

      <section className="cartao space-y-3 p-5 text-sm">
        <h2 className="titulo-secao">Seus direitos</h2>
        <p>Você pode pedir acesso, correção ou eliminação dos seus dados. Para correção ou eliminação do cadastro, procure a secretaria. Os pedidos de oração você mesmo(a) apaga na tela de Comunicação.</p>
        <form method="post" action="/privacidade/exportar">
          <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-marinho px-5 font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900">
            <Download className="h-4 w-4" /> Baixar meus dados (JSON)
          </button>
        </form>
        <p className="text-xs text-muted-foreground">O arquivo traz o que o sistema permite que você veja: seu perfil, seu cadastro de membro, escalas, inscrições, presenças e pedidos de oração.</p>
      </section>
    </div>
  );
}
