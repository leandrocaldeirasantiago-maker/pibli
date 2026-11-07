"use client";
import { useMemo, useState } from "react";

type Sistema = "dominio" | "nasajon" | "alterdata";
const sistemas: { id: Sistema; nome: string; estado: string; formato: string }[] = [
  { id: "dominio", nome: "Domínio Sistemas", estado: "Contrato preliminar, não homologado", formato: "TXT delimitado por ; — codificação Windows-1252 observada; CRLF a confirmar" },
  { id: "nasajon", nome: "Nasajon", estado: "Aguardando contrato oficial", formato: "Formato, campos e versão a confirmar" },
  { id: "alterdata", nome: "Alterdata", estado: "Aguardando contrato oficial", formato: "Formato, campos e versão a confirmar" },
];
const amostras = [
  { id: "EX-001", data: "02/01/2026", tipo: "Receita", categoria: "Oferta", valor: "150,00", conta: "Caixa", mapeada: true },
  { id: "EX-002", data: "03/01/2026", tipo: "Despesa", categoria: "Material", valor: "80,00", conta: "Banco", mapeada: false },
  { id: "EX-003", data: "04/01/2026", tipo: "Receita", categoria: "Doação", valor: "200,00", conta: "Banco", mapeada: true },
];
export default function PainelContabil() {
  const [sistema, setSistema] = useState<Sistema>("dominio");
  const [inicio, setInicio] = useState("2026-01-01");
  const [fim, setFim] = useState("2026-01-31");
  const [conferir, setConferir] = useState(false);
  const selecionado = sistemas.find(s => s.id === sistema)!;
  const problemas = useMemo(() => {
    const erros: string[] = [];
    if (!inicio || !fim || inicio > fim) erros.push("O período informado é inválido.");
    if (sistema !== "dominio") erros.push("Layout e versão oficiais ainda não cadastrados.");
    if (sistema === "dominio") erros.push("Versão do layout Domínio não homologada.");
    if (amostras.some(a => !a.mapeada)) erros.push("Há categorias sem mapeamento contábil na amostra sintética.");
    return erros;
  }, [inicio, fim, sistema]);
  return <div className="space-y-6">
    <section className="grid gap-3 md:grid-cols-3" aria-label="Sistemas contábeis">
      {sistemas.map(s => <button key={s.id} type="button" onClick={() => {setSistema(s.id); setConferir(false);}} aria-pressed={sistema === s.id} className={`cartao p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${sistema === s.id ? "ring-2 ring-blue-600" : ""}`}>
        <h2 className="font-serif text-xl font-semibold">{s.nome}</h2><p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{s.estado}</p><p className="mt-2 text-xs text-muted-foreground">{s.formato}</p>
      </button>)}
    </section>
    <section className="cartao space-y-4 p-5"><h2 className="titulo-secao">Configuração do adaptador — {selecionado.nome}</h2>
      <p className="text-sm text-muted-foreground">Configuração demonstrativa: alterações nesta tela não são salvas e não consultam o Supabase.</p>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Início do período<input aria-label="Início do período" className="w-full rounded-lg border border-border bg-background p-2" type="date" value={inicio} onChange={e => {setInicio(e.target.value);setConferir(false);}} /></label>
      <label className="space-y-1 text-sm">Fim do período<input aria-label="Fim do período" className="w-full rounded-lg border border-border bg-background p-2" type="date" value={fim} onChange={e => {setFim(e.target.value);setConferir(false);}} /></label></div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Versão do layout</dt><dd>Não homologada</dd></div><div><dt className="font-semibold">Mapeamento</dt><dd>Modelo demonstrativo; persistência não implementada</dd></div></dl>
      {sistema === "dominio" && <div className="space-y-2"><h3 className="font-semibold">Campos preliminares observados</h3><pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">data;débito;crédito;valor;histórico;complemento;;;;</pre><p className="text-xs text-muted-foreground">Data DD/MM/AAAA; valor com vírgula decimal; códigos de conta tratados como texto. As quatro posições finais não foram identificadas.</p></div>}
    </section>
    <section className="cartao space-y-3 p-5"><h2 className="titulo-secao">Conferência com dados fictícios</h2><p className="text-sm text-muted-foreground">Os três registros abaixo são exemplos inventados. Nenhum lançamento financeiro real é carregado.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Referência</th><th className="p-2">Data</th><th className="p-2">Tipo</th><th className="p-2">Categoria</th><th className="p-2">Valor (R$)</th><th className="p-2">Mapeamento</th></tr></thead><tbody>{amostras.map(a=><tr key={a.id} className="border-b"><td className="p-2">{a.id}</td><td className="p-2">{a.data}</td><td className="p-2">{a.tipo}</td><td className="p-2">{a.categoria}</td><td className="p-2">{a.valor}</td><td className="p-2">{a.mapeada ? "Exemplo mapeado" : "Pendente"}</td></tr>)}</tbody></table></div>
      <button type="button" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800" onClick={()=>setConferir(true)}>Conferir amostra fictícia</button>
      {conferir && <div role="status" className="rounded-lg border border-amber-400 p-4"><p className="font-semibold">Conferência demonstrativa: {problemas.length} pendência(s)</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{problemas.map(e=><li key={e}>{e}</li>)}</ul></div>}
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Exportação real desativada até homologação e autorização específica.</p>
    </section>
  </div>;
}
