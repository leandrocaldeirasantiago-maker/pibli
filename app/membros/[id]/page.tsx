import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, User } from "lucide-react";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { obterMembroCompleto } from "@/lib/membros/consultas";
import {
  ESTADOS_CIVIS,
  SITUACOES,
  TIPOS_HISTORICO,
  formatarDataBr,
  formatarTelefone,
} from "@/lib/membros/esquema";
import { PAPEIS_GESTAO } from "@/lib/membros/tipos";
import { linkWhatsApp, saudacaoPastoral } from "@/lib/whatsapp";
import { BotaoExcluirMembro, FormularioHistorico } from "@/components/membros/acoes-membro";

export const metadata = { title: "Membro — Igreja Batista em Largo da Ideia" };

function Item({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 text-sm">{valor || "—"}</dd>
    </div>
  );
}

export default async function PaginaMembro({ params: paramsPromessa }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromessa;
  const usuario = await obterUsuarioAtual();
  const completo = await obterMembroCompleto(params.id);
  if (!completo) notFound();

  const { membro: m, ministerios, familiares, historico, fotoUrl } = completo;
  const podeEditar = !!usuario && PAPEIS_GESTAO.includes(usuario.papel);
  const podeExcluir = usuario?.papel === "administrador";

  const situacao = Object.fromEntries(SITUACOES)[m.situacao] ?? m.situacao;
  const estadoCivil = m.estado_civil ? Object.fromEntries(ESTADOS_CIVIS)[m.estado_civil] : null;
  const tipos = Object.fromEntries(TIPOS_HISTORICO);
  const endereco = [
    [m.logradouro, m.numero].filter(Boolean).join(", "),
    m.complemento,
    m.bairro,
    [m.cidade, m.uf].filter(Boolean).join("/"),
    m.cep ? `CEP ${String(m.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt={`Foto de ${m.nome_completo}`} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <User className="h-9 w-9" />
            </span>
          )}
          <div>
            <h1 className="font-serif text-2xl font-semibold lg:text-3xl">{m.nome_completo}</h1>
            <p className="text-sm text-muted-foreground">
              {situacao}
              {m.familias?.nome ? ` · Família ${m.familias.nome}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href="/membros" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-muted">
            Voltar
          </Link>
          {podeEditar && (
            <Link
              href={`/membros/${m.id}/editar`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-marinho px-4 text-sm font-medium text-white hover:bg-marinho-700 dark:bg-dourado dark:text-marinho-900"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          )}
          {podeExcluir && <BotaoExcluirMembro id={m.id} nome={m.nome_completo} />}
        </div>
      </div>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-4">Dados pessoais</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Item rotulo="Data de nascimento" valor={formatarDataBr(m.data_nascimento)} />
          <Item rotulo="Estado civil" valor={estadoCivil} />
          <Item rotulo="Telefone" valor={formatarTelefone(m.telefone)} />
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">WhatsApp</dt>
            <dd className="mt-0.5 text-sm">
              {linkWhatsApp(m.whatsapp, saudacaoPastoral(m.nome_completo)) ? (
                <a
                  href={linkWhatsApp(m.whatsapp, saudacaoPastoral(m.nome_completo))!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline dark:text-emerald-300"
                >
                  {formatarTelefone(m.whatsapp)} — abrir conversa
                </a>
              ) : (
                formatarTelefone(m.whatsapp) || "—"
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <Item rotulo="Endereço" valor={endereco} />
          </div>
        </dl>
      </section>

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-4">Vida na igreja</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Item rotulo="Data de batismo" valor={formatarDataBr(m.data_batismo)} />
          <Item rotulo="Data de ingresso" valor={formatarDataBr(m.data_ingresso)} />
          <Item rotulo="Parentesco na família" valor={m.parentesco} />
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Ministérios</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {ministerios.length === 0 && <span className="text-sm">—</span>}
              {ministerios.map((x) => (
                <span key={x.id} className="rounded-full bg-muted px-3 py-1 text-sm">
                  {x.nome}
                  {x.funcao === "lider" ? " (líder)" : ""}
                </span>
              ))}
            </dd>
          </div>
          {m.observacoes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Item rotulo="Observações" valor={m.observacoes} />
            </div>
          )}
        </dl>
      </section>

      {familiares.length > 0 && (
        <section className="cartao p-5">
          <h2 className="titulo-secao mb-3">Cadastro familiar</h2>
          <ul className="divide-y divide-border text-sm">
            {familiares.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2.5">
                <Link href={`/membros/${f.id}`} className="font-medium text-marinho hover:underline dark:text-dourado">
                  {f.nome_completo}
                </Link>
                <span className="text-muted-foreground">{f.parentesco ?? ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cartao p-5">
        <h2 className="titulo-secao mb-3">Histórico de participação</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro no histórico.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {historico.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                <span className="w-24 text-muted-foreground">{formatarDataBr(h.data)}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{tipos[h.tipo] ?? h.tipo}</span>
                <span className="flex-1">{h.descricao}</span>
              </li>
            ))}
          </ul>
        )}
        {podeEditar && <FormularioHistorico membroId={m.id} />}
      </section>
    </div>
  );
}
