# Sistema de Agendamento de Salas

Projeto Extensionista (Prof. Demétrius) — Acassio, Eduarda, Lucca, Lucas e Rosane.

## O que é

Sem um controle centralizado, a instituição sofre conflitos de horário na reserva de salas. Este sistema web permite que **professores** solicitem reservas e que a **direção** (admin) aprove ou recuse, e **impede automaticamente** duas reservas ativas sobrepostas na mesma sala, mesmo com requisições simultâneas. Todo o histórico fica registrado e cada mudança de status gera um e-mail ao solicitante.

| Perfil | Pode |
|---|---|
| Professor (`usuario`) | Ver o calendário, criar reservas, cancelar as próprias e ver o próprio histórico |
| Direção (`admin`) | Tudo do professor + aprovar/recusar, cancelar qualquer reserva, gerenciar salas e usuários, gerar relatório PDF |

Não há cadastro público: só o admin cria contas.

## Arquitetura

```
Navegador (React)
   │  login direto no Supabase Auth → recebe token (JWT)
   │  chamadas HTTP /api/... com header Authorization: Bearer <token>
   ▼
Netlify Function "api" (Express)
   routes → controllers → services → repositories
   │  SQL via postgres.js (DATABASE_URL, pooler)
   ▼
Supabase PostgreSQL (RLS ligada, sem políticas públicas)
```

Stack: React + Vite + TypeScript + Tailwind, FullCalendar, Express em Netlify Function, postgres.js, Supabase (Auth + PostgreSQL), Nodemailer (Gmail), Zod, Vitest.

O navegador nunca lê nem grava tabelas: o Supabase é usado no front apenas para login e obtenção do token.

```
server/        API: routes → controllers → services → repositories (+ lib/, middlewares/)
src/           interface React
shared/        constantes e esquemas Zod usados pelo front e pela API
supabase/      migrações SQL (supabase/migrations) e salas de exemplo
netlify/       entrada da Netlify Function
tests/         unit (sem banco) e integracao (banco de testes)
docs/          roteiro de testes, primeiro admin, especificação
```

### Onde está cada regra

| Regra | Onde |
|---|---|
| Regras de negócio (horário 07–23h, seg–sáb, duração mínima, transições de status, e-mails, inativações) | `server/services/` |
| **Nunca duas reservas ativas sobrepostas na mesma sala** | Constraint de exclusão `reservas_sem_conflito` em `supabase/migrations/20261027000000_esquema_inicial.sql` (o banco recusa; a API devolve 409) |
| Aprovar/recusar/cancelar sem corrida | `UPDATE` condicional (só muda se o status ainda permite) em `server/services/reservas.ts` |
| Transações | `server/lib/db.ts` |
| Permissões por papel | `server/middlewares/autenticar.ts` e `exigirAdmin.ts` |
| Constantes e validação compartilhadas | `shared/` |

**Transação feita à mão (`server/lib/db.ts`):** o pooler de transação do Supabase (porta 6543) não responde às consultas em *pipeline* do postgres.js; com `max: 1` isso travava requisições concorrentes. Por isso o cliente usa `max_pipeline: 0` (consultas estritamente em série) e, como nesse modo o `sql.begin` falha, a transação reserva uma conexão e executa `BEGIN`/`COMMIT`/`ROLLBACK` manualmente.

## Rodando localmente

1. `npm install`
2. Copie `.env.example` para `.env` e preencha (projeto Supabase, Gmail com senha de app). Para os testes de integração, preencha também `.env.test` com o projeto Supabase **de testes**.
3. `npm run dev` e abra http://localhost:8888

Observação: `npm run dev` apaga `dist/_redirects` antes de iniciar (senão o `netlify dev` aplica as regras de produção). Não use `npx netlify dev` direto logo após um `npm run build`.

## Testes

- `npm test` — unitários (Vitest, sem banco).
- `npm run test:integracao` — integração e concorrência, no projeto Supabase de testes. **Nunca aponte `.env.test` para produção** (há uma trava que recusa).
- `npm run typecheck` — verificação de tipos.
- Testes manuais no site publicado: [docs/roteiro-de-testes.md](docs/roteiro-de-testes.md) (inclui a medição do RNF001).

## Migrações do banco

```
npx supabase db push --db-url "$DATABASE_URL_MIGRACAO"
```

`DATABASE_URL_MIGRACAO` é o pooler de sessão (porta 5432). Para o projeto de testes use `TEST_DATABASE_URL_MIGRACAO`.

## Primeiro administrador

O cadastro público fica desligado no Supabase; o primeiro admin é criado manualmente. Passo a passo em [docs/primeiro-admin.md](docs/primeiro-admin.md). No Supabase, também desative "Allow new users to sign up" e mantenha "Secure email change" ligado.

## Publicação

1. Suba o repositório no GitHub.
2. No Netlify: "Import from Git", build `npm run build`, publish `dist` (já em `netlify.toml`).
3. Em Site settings → Environment variables, cadastre:

| Variável | Usada por |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | front (login) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | API (nunca expor no front) |
| `DATABASE_URL` | API (pooler, porta 6543) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | API (e-mails) |
| `APP_URL` | URL do site, usada nos links dos e-mails |

`public/_redirects` mantém `/api/*` antes do fallback da SPA. Notas: o Supabase gratuito pausa após 7 dias sem uso (acesse antes da apresentação); o Gmail exige verificação em duas etapas para gerar a senha de app.

## Rastreabilidade dos requisitos

| Requisito | Onde é atendido |
|---|---|
| RF001 Login | Supabase Auth + `/login` |
| RF002 Cadastrar usuários | `POST /api/usuarios`, tela Usuários |
| RF003 Controle de acesso | `exigirAdmin`, menu e rotas por papel |
| RF004 / RF005 Salas | `/api/salas`, tela Salas |
| RF006 Criar reserva | `POST /api/reservas`, modal no calendário e botão "Nova reserva" |
| RF007 Disponibilidade | Constraint `reservas_sem_conflito` + 409 |
| RF008 Cancelar | `POST /api/reservas/:id/cancelar` |
| RF009 Calendário | Tela Calendário (FullCalendar) |
| RF10 Filtros | Filtros do calendário e da tela Histórico de reservas |
| RF11 Aprovação | Tela Aprovações e modal de detalhes |
| RF12 Notificação | Status na interface + e-mail em toda mudança de status |
| RF13 Histórico | `historico_reservas` + tela Histórico de reservas |
| RF14 Relatório PDF | `/api/relatorios/mensal` + jsPDF |
| RF15 Inativar usuários | Inativar/reativar + bloqueio no Auth + cancelamento das reservas futuras |
| RNF001 ≤ 2 s | Conflito verificado pelo índice GiST numa única inserção; medido no site publicado |
| RNF002 / RNF009 Concorrência e transações | Constraint de exclusão + UPDATE condicional + transações `postgres.js` |
| RNF003 Hash de senha | Supabase Auth (bcrypt) |
| RNF004 Sessão | Logout por inatividade de 30 min |
| RNF005 Proteção de dados | Middleware `autenticar` + RLS sem políticas públicas + signup desligado |
| RNF006 Responsivo | Tailwind + visão de lista e "Nova reserva" no celular |
| RNF007 3 cliques | Fluxo de reserva a partir da sala no calendário |
| RNF008 Disponibilidade 99% | Netlify + Supabase gerenciados |
| RNF10 Navegadores | React/Vite com alvos modernos |
| RNF11 Camadas | routes → controllers → services → repositories |

Especificação completa: `docs/superpowers/specs/2026-10-27-agendamento-salas-design.md`.
