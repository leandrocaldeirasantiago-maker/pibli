# Igreja Batista em Largo da Ideia — Sistema de Gestão Eclesiástica

Next.js 15 (App Router, React 19) + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS). Tudo em português do Brasil, com tema claro/escuro e PWA básico.

> **Banco testado, app não:** as migrações e os testes SQL (`rls.sql`, `fumaca.sql`) rodaram num Postgres 16 com uma imitação mínima do Supabase (`docs/TESTE-LOCAL.md`). O código do app continua sem `npm`, typecheck e build.
>
> **Estado real:** todo o código das Etapas 1–8 e do Louvor foi escrito sem poder executar `npm`, o TypeScript, os testes ou o Supabase (o ambiente de desenvolvimento não tinha rede). O banco foi testado (acima), mas **o código do app nunca foi compilado nem executado**. Antes de usar com dados reais, siga `docs/ETAPA-7.md` (verificação e implantação).

## Módulos
| Módulo | Documento |
|---|---|
| Login, papéis, permissões | `docs/ETAPA-2.md` |
| Painel e membros | `docs/ETAPA-3.md` |
| Financeiro | `docs/ETAPA-4.md` |
| Cultos/eventos, ministérios, secretaria, notificações | `docs/ETAPA-5.md` |
| Comunicação, configurações, relatórios, LGPD, backup | `docs/ETAPA-6.md` |
| Segurança, testes e implantação | `docs/ETAPA-7.md` |
| Louvor, fatia 1 (painel, biblioteca, repertórios, escalas) | `docs/LOUVOR-1.md` |
| Louvor, fatia 2 (cifras com transposição, modo palco, metrônomo, afinador) | `docs/LOUVOR-2.md` |
| Louvor, fatia 3 (ensaios e frequência, favoritas, acesso offline) | `docs/LOUVOR-3.md` |
| Pendências gerais: importação de membros, verificação pública de documentos, logotipo, MFA | `docs/ETAPA-8.md` |
| Avisos por e-mail (esqueleto, sem provedor contratado) | `docs/EMAIL.md` |
| **Roteiro da primeira execução real (projetos Supabase de teste)** | `docs/ROTEIRO-SUPABASE-TESTE.md` |
| **Pendências e simulações: o que falta, o que foi testado, o que só você pode fazer** | `docs/PENDENCIAS.md` |
| WhatsApp (link "abrir conversa", sem envio automático) | `docs/WHATSAPP.md` |
| Teste do banco num Postgres local | `docs/TESTE-LOCAL.md` |
| Decisões de privacidade (dízimos, encarregado, retenção) | `docs/LGPD.md` |

## Executar
Requisitos: Node.js 18.18+ (recomendado 20).
```bash
cp .env.example .env.local   # preencha URL e chave anônima do Supabase
npm install
npm run typecheck && npm run lint && npm test
npm run dev                  # http://localhost:3000
```
Banco: aplique `supabase/migrations/0001` … `0018` em ordem (SQL Editor do Supabase). Testes de segurança do banco: `supabase/tests/rls.sql`.

## Segurança em uma linha
Permissões valem no banco (RLS e funções com verificação de papel), não só na tela; a chave `service_role` nunca é usada pela aplicação; nada importante é apagado (cancela-se/anula-se/arquiva-se); ações sensíveis vão para a auditoria sem gravar o conteúdo.

## Estrutura
```
src/app/          páginas e ações do servidor, por módulo
src/components/   componentes por módulo
src/lib/          regras puras (esquemas Zod, datas, permissões) e consultas
supabase/         migrações e testes de RLS
scripts/          restaurar-backup.mjs (uso técnico local), verificar-supabase.mjs (confere o painel só com a chave pública), checar-next.mjs (regras do Next/ESLint que derrubam o build), verificar-tudo.mjs, gerar-sql-unico.mjs, teste-supabase/, emulador-email.mjs, teste-restauracao/, teste-offline/, teste-rota-email/, teste-ssr/
docs/             um documento por etapa
```
