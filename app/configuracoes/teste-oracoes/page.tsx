
"use client";

import { useState } from "react";

export default function TesteOracoes() {
  const [resultado, setResultado] = useState("Aguardando teste");
  const [executando, setExecutando] = useState(false);

  async function testar() {
    setExecutando(true);
    setResultado("Testando autorização...");

    try {
      const resposta = await fetch("/api/admin/oracoes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          id: "1f30b582-26bd-42b0-a0bb-e908595c6024",
          acao: "ocultar",
        }),
      });

      const dados = await resposta.json();

      setResultado(
        `HTTP ${resposta.status}: ${
          dados.error ?? "Resposta recebida"
        }`
      );
    } catch {
      setResultado("Erro ao comunicar com a API");
    } finally {
      setExecutando(false);
    }
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>PIBLI — Teste de autorização de orações</h1>

      <p>
        Teste administrativo com identificador fictício.
        Nenhum pedido real será modificado.
      </p>

      <button
        type="button"
        onClick={testar}
        disabled={executando}
        style={{
          padding: "12px 20px",
          background: "#173153",
          color: "white",
          border: 0,
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Testar autorização
      </button>

      <p role="status">{resultado}</p>
    </main>
  );
}
