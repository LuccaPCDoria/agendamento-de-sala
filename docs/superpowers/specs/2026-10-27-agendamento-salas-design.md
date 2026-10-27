# Sistema de Agendamento de Salas — Especificação de Design

- **Data:** 2026-10-27 (revisada após revisão técnica)
- **Disciplina:** Projeto Extensionista — Prof. Demétrius
- **Equipe:** Acassio, Eduarda, Lucca, Lucas e Rosane
- **Documento de origem:** `D:\pessoal\Projeto_ Agendamento de Salas.docx` (requisitos RF001–RF15 e RNF001–RNF11)

## 1. Objetivo e critérios de sucesso

**Problema:** sem um controle centralizado, a instituição sofre conflitos de horário na reserva de salas.

**Objetivo:** um sistema web onde professores solicitam reservas, a direção aprova, e o sistema **impede automaticamente** duas reservas ativas sobrepostas na mesma sala.

**Critérios de sucesso:**
1. Sistema publicado e funcionando na internet (Netlify + Supabase), cobrindo os requisitos Essenciais e Importantes do documento de origem; os Desejáveis entram depois.
2. É impossível gravar duas reservas pendentes/aprovadas sobrepostas na mesma sala, inclusive com requisições simultâneas — comprovado por teste automatizado.
3. A equipe consegue explicar a arquitetura em camadas e apontar onde cada regra está no código.

## 2. Usuários e perfis

| Perfil (`papel`) | Quem é | Pode |
|---|---|---|
| `usuario` | Professores | Ver calendário, criar reservas, cancelar as próprias, ver as próprias reservas e seu histórico |
| `admin` | Direção da faculdade | Tudo do professor + aprovar/recusar, cancelar qualquer reserva, cadastrar/editar/inativar salas e usuários, gerar relatório |

- **Não existe cadastro público.** Somente o admin cria contas, definindo uma senha inicial. O signup público do Supabase Auth fica **desligado** (ver §9).
- Toda reserva pertence a quem a criou: o admin **não** reserva em nome de um professor.
- O primeiro admin é criado manualmente (procedimento em §9).

## 3. Stack

| Camada | Tecnologia | Hospedagem |
|---|---|---|
| Interface | React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, FullCalendar (plugins gratuitos: dayGrid, timeGrid, list, interaction), jsPDF + jspdf-autotable | Netlify |
| API / regras | Node.js + Express + TypeScript, executado como Netlify Function **v1** (`export const handler`) via `serverless-http` | Netlify (mesmo deploy) |
| Validação | Zod — esquemas em `shared/`, usados pelo front e pela API | — |
| Banco | PostgreSQL do Supabase, acessado pela API com `postgres.js` (SQL direto, com transações) | Supabase |
| Autenticação | Supabase Auth (senhas com bcrypt) | Supabase |
| E-mail | Nodemailer + Gmail (senha de app) | — |
| Testes | Vitest (+ supertest para testes HTTP) | — |

## 4. Arquitetura

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

- O navegador **nunca** lê nem grava tabelas diretamente; o Supabase é usado no front apenas para login/logout e obtenção do token.
- `netlify.toml`: redirect `/api/*` → `/.netlify/functions/api/:splat` com `status = 200`, declarado **antes** do fallback da SPA (`/*` → `/index.html`, 200).
- O roteador Express é montado em `app.use(['/api', '/.netlify/functions/api'], router)`, porque o caminho recebido varia entre `netlify dev` e produção.
- O cliente `postgres.js` é criado no escopo do módulo (reaproveitado entre invocações "quentes"), com `max: 1`, `idle_timeout` curto e `prepare: false`.

### Estrutura do repositório

```
agendamento-salas/
  src/                    front-end (pages/, components/, hooks/, lib/api.ts, lib/supabase.ts)
  server/
    app.ts                cria o app Express (usado pela function e pelos testes)
    routes/               URLs
    controllers/          lê requisição, chama serviço, devolve resposta
    services/             REGRAS DE NEGÓCIO
    repositories/         SQL
    middlewares/          autenticar, exigirAdmin, tratarErros
    lib/                  db.ts, email.ts, supabaseAdmin.ts, erros.ts, datas.ts
  shared/                 esquemas Zod, tipos e constantes (horário de funcionamento)
  netlify/functions/api.ts
  supabase/migrations/    *.sql
  docs/                   specs, roteiro de testes, procedimento do primeiro admin
  tests/
  netlify.toml
```

### Contrato entre serviços e banco (testabilidade)
- `lib/db.ts` exporta `transacao(fn)`, que abre `sql.begin` e entrega a `fn` um objeto com os repositórios ligados à transação.
- Cada repositório é criado a partir de um executor (`sql` ou `tx`): `criarRepositorioReservas(executor)`.
- Os serviços recebem suas dependências (repositórios, `transacao`, `enviarEmail`, `supabaseAdmin`) por parâmetro. Nos testes unitários, `transacao` é um fake que apenas chama `fn(reposFalsos)`.

## 5. Banco de dados

### Datas e fuso horário
- Colunas de data/hora são `timestamptz`.
- A API recebe datas **somente** em ISO 8601 com offset ou `Z` (Zod: `z.string().datetime({ offset: true })`) e devolve em ISO UTC.
- Toda regra de calendário (mesmo dia, horário de funcionamento, limites de mês) é calculada no fuso **America/Sao_Paulo** com funções de `lib/datas.ts` (`date-fns-tz`), nunca com `getDate()`/`getHours()` do servidor (que roda em UTC).
- O front usa o fuso local do navegador (`timeZone: 'local'` no FullCalendar). Premissa: usuários no Brasil, no fuso de Brasília.

### Tabelas

**`perfis`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | = `auth.users.id` (FK, `on delete restrict`) |
| nome | text not null | |
| email | text not null | índice único em `lower(email)` |
| papel | enum `papel_usuario` (`usuario`, `admin`) not null | padrão `usuario` |
| ativo | boolean not null | padrão `true` |
| criado_em | timestamptz not null | padrão `now()` |

**`salas`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | padrão `gen_random_uuid()` |
| nome | text not null | índice único em `lower(nome)` |
| tipo | enum `tipo_sala` (`reuniao`, `biblioteca`, `laboratorio`) not null | |
| capacidade | integer not null | `> 0` |
| recursos | text[] not null | padrão `{}` |
| ativa | boolean not null | padrão `true` |
| criado_em | timestamptz not null | padrão `now()` |

**`reservas`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | padrão `gen_random_uuid()` |
| sala_id | uuid not null FK → salas | |
| usuario_id | uuid not null FK → perfis | solicitante |
| inicio, fim | timestamptz not null | `CHECK (fim > inicio)` |
| status | enum `status_reserva` (`pendente`, `aprovada`, `recusada`, `cancelada`) not null | sem padrão: o serviço decide |
| finalidade | text not null | até 200 caracteres |
| motivo_recusa | text | preenchido apenas quando recusada |
| criado_em, atualizado_em | timestamptz not null | padrão `now()`; `atualizado_em` é atualizado pelo SQL de cada transição |

**`historico_reservas`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | bigint identity PK | |
| reserva_id | uuid not null FK → reservas | |
| status_anterior | status_reserva | nulo na criação |
| status_novo | status_reserva not null | |
| alterado_por | uuid not null FK → perfis | |
| alterado_em | timestamptz not null | padrão `now()` |

Índices: `reservas (usuario_id, inicio)`, `reservas (status)`, `historico_reservas (reserva_id)`. A busca por sala e período é coberta pelo índice GiST da constraint.

### Regra principal (RF007, RNF002, RNF009)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE reservas ADD CONSTRAINT reservas_sem_conflito
  EXCLUDE USING gist (sala_id WITH =, tstzrange(inicio, fim, '[)') WITH &&)
  WHERE (status IN ('pendente', 'aprovada'));
```

- Intervalo `[)`: uma reserva que termina às 10h não conflita com outra que começa às 10h.
- Recusadas e canceladas não bloqueiam horário.
- Violação gera erro Postgres `23P01`, convertido pela API em HTTP 409.

### Segurança no banco
- RLS habilitada em todas as tabelas, **sem políticas** para `anon`/`authenticated` → acesso direto pelo navegador é negado (RNF005).
- A API conecta via `DATABASE_URL` (pooler em modo transação, porta 6543).

## 6. Regras de negócio (camada `services/`)

### Constantes (em `shared/`)
- Horário de funcionamento: **07:00 às 23:00** (America/Sao_Paulo).
- Duração mínima: 15 minutos.

### Criar reserva
- Sala deve existir e estar ativa.
- `inicio` no futuro; `fim > inicio`; início e fim no **mesmo dia** e dentro do horário de funcionamento (`inicio ≥ 07:00`, `fim ≤ 23:00`); duração ≥ 15 minutos; `finalidade` obrigatória.
- Criada por professor → `pendente`. Criada por admin → `aprovada`.
- Grava a reserva e a linha de histórico (`null → status inicial`) na **mesma transação**.

### Transições de status
Cada transição é feita por **um único UPDATE condicional** dentro da transação, para que duas ações simultâneas (ex.: admin aprova enquanto o dono cancela) nunca tenham sucesso juntas:

```sql
UPDATE reservas SET status = $novo, motivo_recusa = $motivo, atualizado_em = now()
 WHERE id = $id AND status = ANY($permitidos) AND inicio > now()
RETURNING *;
```
- 1 linha → grava o histórico na mesma transação.
- 0 linhas e a reserva existe → 409 ("Esta reserva não pode mais ser alterada."); não existe → 404.

| Ação | Quem | Status permitidos | Condições extras | Resultado |
|---|---|---|---|---|
| Aprovar | admin | `pendente` | início no futuro; sala ativa (senão 409 "Sala inativa") | `aprovada` |
| Recusar | admin | `pendente` | `motivo_recusa` obrigatório | `recusada` |
| Cancelar | dono ou admin | `pendente`, `aprovada` | início no futuro | `cancelada` |

- **Pendente expirada:** uma reserva `pendente` cujo início já passou não muda de status no banco, mas é exibida como **"Expirada"** na interface e no PDF, e não aparece na tela de Aprovações.

### E-mails (RF12)
- O solicitante recebe e-mail em **toda** mudança de status: criação ("Solicitação recebida" ou "Reserva confirmada" quando criada por admin), aprovação, recusa (com motivo) e cancelamento (por ele próprio, pela direção ou automático por inativação).
- Ordem: **commit → envio dos e-mails com `await` → resposta HTTP.** A função serverless congela após responder, então nada é enviado depois da resposta.
- O transporter tem timeout de 5 s; vários e-mails (inativação) são enviados em paralelo com `Promise.allSettled`. Falha de envio é registrada em log e **não** desfaz a operação nem gera erro para o usuário.
- O remetente é o próprio `GMAIL_USER`. O e-mail inclui sala, data, horário, novo status e o link `APP_URL`.

### Salas
- Nome único (sem diferenciar maiúsculas).
- **Inativar sala:** na mesma transação, marca `ativa = false` e cancela automaticamente as reservas futuras `pendente`/`aprovada` dessa sala (histórico com `alterado_por` = admin); depois envia os e-mails aos solicitantes. Reativar não restaura reservas canceladas.

### Usuários
- **Criar** (admin): cria a conta no Supabase Auth (`auth.admin.createUser` com `email_confirm: true`, senha inicial com mínimo de 8 caracteres) e insere em `perfis`. Se a inserção falhar, a conta do Auth é excluída (compensação). E-mail já existente → 409.
- **Editar** (admin): nome, e-mail, papel e, opcionalmente, nova senha (mínimo 8 caracteres). Ordem: atualiza primeiro o Auth (`auth.admin.updateUserById` com `email_confirm: true` quando o e-mail muda), depois `perfis`; se `perfis` falhar, reverte o e-mail no Auth. E-mail duplicado → 409.
- **Inativar** (admin): na mesma transação, `ativo = false` e cancelamento automático das reservas futuras `pendente`/`aprovada` do usuário (histórico com `alterado_por` = admin); depois bloqueia no Auth (`ban_duration: '876000h'`) e envia os e-mails. **Reativar:** `ativo = true` e `ban_duration: 'none'`. Dados e histórico são mantidos (RF15).
- Um admin não pode inativar a si mesmo nem remover o próprio papel de admin.

## 7. API

Todas as rotas exigem token válido e usuário ativo. Respostas em JSON.

| Método e rota | Acesso | Descrição |
|---|---|---|
| `GET /api/me` | logado | Dados e papel do usuário atual |
| `GET /api/usuarios` | admin | Listar usuários |
| `POST /api/usuarios` | admin | Criar usuário |
| `PATCH /api/usuarios/:id` | admin | Editar nome/e-mail/papel/nova senha |
| `POST /api/usuarios/:id/inativar` · `/reativar` | admin | Inativar (cancela reservas futuras) / reativar |
| `GET /api/salas` | logado | Listar salas ativas (`?incluirInativas=true` só para admin) |
| `POST /api/salas` | admin | Criar sala |
| `PATCH /api/salas/:id` | admin | Editar dados |
| `POST /api/salas/:id/inativar` · `/reativar` | admin | Inativar (cancela reservas futuras) / reativar |
| `GET /api/reservas` | logado | Ver regras abaixo |
| `POST /api/reservas` | logado | Criar reserva |
| `POST /api/reservas/:id/aprovar` | admin | Aprovar |
| `POST /api/reservas/:id/recusar` | admin | Recusar (`{ motivo }`) |
| `POST /api/reservas/:id/cancelar` | dono ou admin | Cancelar |
| `GET /api/reservas/:id/historico` | dono ou admin | Mudanças de status com **nome** de quem alterou e data/hora |
| `GET /api/relatorios/mensal?mes=AAAA-MM` | admin | Reservas do mês (todas as situações, pendentes vencidas marcadas como expiradas), com totais por status |

### `GET /api/reservas`
- Parâmetros `inicio` e `fim` **obrigatórios**, intervalo máximo de 62 dias. Filtros opcionais: `salaId`, `tipo`, `status`, `minhas=true`.
- **Professor sem `minhas`** (calendário): somente `pendente`/`aprovada`, de todos os usuários — o filtro `status` só pode restringir dentro desse conjunto.
- **Professor com `minhas=true`:** todas as próprias reservas, qualquer status.
- **Admin:** por padrão `pendente`/`aprovada`; pode pedir qualquer status pelo filtro.
- Cada item traz sala (nome, tipo), solicitante (nome), horário, status, finalidade e `expirada` (booleano derivado).
- Limites de mês do relatório calculados em America/Sao_Paulo (`make_timestamptz(ano, mes, 1, 0, 0, 0, 'America/Sao_Paulo')` até o mês seguinte).

### Middlewares
- `autenticar`: valida o JWT com o Supabase (`auth.getUser(token)`), carrega o perfil, rejeita usuário sem perfil ou inativo.
- `exigirAdmin`: 403 se `papel !== 'admin'`.
- `tratarErros`: converte erros em `{ "erro": "mensagem" }`.

### Erros
| Situação | HTTP | Mensagem exemplo |
|---|---|---|
| Sem token / token inválido | 401 | "Faça login para continuar." |
| Usuário inativo, sem perfil ou sem permissão | 403 | "Você não tem permissão para esta ação." |
| Registro não encontrado | 404 | "Reserva não encontrada." |
| Dados inválidos (Zod / regra) | 400 | "O horário de término deve ser depois do início." |
| Conflito de horário (`23P01`) | 409 | "Esta sala já está reservada nesse horário." |
| Transição de status inválida / sala inativa / e-mail duplicado | 409 | "Esta reserva não pode mais ser alterada." |
| Erro inesperado | 500 | "Erro interno. Tente novamente." (detalhes só no log) |

## 8. Interface

### Telas
| Rota | Perfis | Conteúdo |
|---|---|---|
| `/login` | público | E-mail e senha |
| `/` Calendário | todos | FullCalendar com visões dia/semana/mês; filtros por sala, tipo e status; eventos 🟨 pendente / 🟩 aprovada com sala, horário, solicitante e finalidade; botão **"Nova reserva"** |
| `/reservas` Histórico de reservas | todos | Professor: as próprias; admin: todas. Filtros por período, sala e status. Mostra status (incluindo "Expirada"), motivo de recusa, botão cancelar e o histórico de mudanças de cada reserva (RF08, RF13) |
| `/aprovacoes` | admin | Pendentes não expiradas, com aprovar / recusar (motivo obrigatório) |
| `/salas` | admin | Listagem, cadastro, edição, inativar/reativar (com aviso de que reservas futuras serão canceladas) |
| `/usuarios` | admin | Listagem, cadastro, edição (inclui nova senha), inativar/reativar (com o mesmo aviso) |
| `/relatorios` | admin | Seleção de mês e download do PDF (jsPDF + jspdf-autotable) |

- Menu lateral filtrado pelo papel; no celular vira menu hambúrguer.
- Rotas protegidas: não logado → `/login`; professor em tela de admin → "Acesso negado". A API também valida.

### Fluxo de reserva (RNF007 — até 3 cliques)
Conforme o RNF007, a contagem parte da **visualização da sala no calendário** (filtro de sala ativo):
1. Clicar/arrastar sobre um horário livre nas visões de dia ou semana → abre o modal com sala, data e horário preenchidos.
2. Informar a finalidade (digitação).
3. Confirmar.

- Sem filtro de sala, o modal pede também a sala.
- Na **visão de mês**, clicar em um dia abre a visão de dia daquela data.
- O botão **"Nova reserva"** (todas as visões, essencial no celular) abre o mesmo modal com data e horário editáveis.
- Seleções fora do horário de funcionamento são bloqueadas no calendário (`businessHours`/`selectConstraint` 07:00–23:00).
- Em caso de conflito (409), o modal permanece aberto com a mensagem de erro.

### Sessão e login
- **Erros de login** do Supabase traduzidos: credenciais inválidas → "E-mail ou senha incorretos."; usuário bloqueado → "Usuário inativo. Procure a direção."
- Se `/api/me` responder 401/403, o front faz logout local e volta para `/login`.
- **Inatividade (RNF004):** o horário da última interação (mouse, teclado, toque, com throttle) é salvo em `localStorage` (compartilhado entre abas). Ao abrir o app e a cada minuto, se passaram 30 minutos, executa `signOut({ scope: 'local' })` e redireciona para `/login` com "Sessão expirada". Isso cobre também o caso de fechar e reabrir o navegador.

### Outros comportamentos
- **Responsivo (RNF006):** em telas estreitas o calendário abre na visão de lista; novas reservas são feitas pelo botão "Nova reserva".
- Após qualquer ação (reservar, aprovar, cancelar), os dados afetados são recarregados automaticamente (TanStack Query).

## 9. Configuração e deploy

- Repositório Git único no GitHub; Netlify conectado à branch `main` com deploy automático.
- Build: `vite build` → `dist/`; functions em `netlify/functions/`.
- Desenvolvimento local: `netlify dev` (front + API).
- Migrações SQL em `supabase/migrations/`, aplicadas com a Supabase CLI (`supabase db push`).

### Configuração do Supabase
- Authentication → Settings: **desativar "Allow new users to sign up"**.
- **Primeiro admin** (documentado em `docs/primeiro-admin.md`):
  1. Painel → Authentication → Add user, com "Auto Confirm User".
  2. SQL Editor: `insert into perfis (id, nome, email, papel) select id, 'Direção', email, 'admin' from auth.users where email = '<email>';`
- Salas de exemplo: script `supabase/salas-exemplo.sql`, executado manualmente no SQL Editor (opcional).

### Variáveis de ambiente
| Variável | Usada por |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | front (login) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | API (validar token, gerenciar contas) — nunca expor no front |
| `DATABASE_URL` | API (pooler, porta 6543) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | API (Nodemailer) |
| `APP_URL` | API (link do sistema nos e-mails) |

### Observações operacionais
- O Supabase gratuito pausa após 7 dias sem uso: acessar o sistema alguns dias antes da apresentação.
- Gmail: exige verificação em duas etapas para gerar a senha de app; limite de cerca de 500 destinatários/dia, suficiente para o projeto.
- Netlify Functions têm limite de 10 s por requisição — por isso o timeout de 5 s no envio de e-mail.

## 10. Testes

1. **Unitários (Vitest, sem banco):** serviços com repositórios e `transacao` falsos (contrato em §4) — reserva no passado, fim antes do início, dias diferentes, fora de 07:00–23:00, menos de 15 min, sala inativa, reserva de admin nasce aprovada, transições permitidas e proibidas, permissões de cancelamento, compensação na criação/edição de usuário, e-mail enviado em cada transição e falha de e-mail não quebrando a operação, conversão de fuso em `lib/datas.ts` (ex.: reserva às 22h em Brasília = 01h UTC do dia seguinte).
2. **Integração (Vitest + projeto Supabase de testes separado):**
   - Repositórios: reservas sobrepostas → erro `23P01`; reservas encostadas (10h–11h e 11h–12h) → ambas aceitas; reserva cancelada libera o horário.
   - **Duas criações simultâneas para o mesmo horário → exatamente uma aceita** (demonstração de RF007/RNF002/RNF009).
   - **Aprovar e cancelar simultâneos → exatamente um vence.**
   - HTTP (supertest em `server/app.ts`): conflito → 409 com a mensagem em português; professor em rota de admin → 403; sem token → 401.
3. **Roteiro de teste manual** (`docs/roteiro-de-testes.md`): login, reservar, conflito, aprovar, recusar, cancelar, e-mails recebidos, inativar usuário e sala (reservas canceladas), tentar logar inativo, sessão expirada, celular.
4. **Desempenho (RNF001):** medir o tempo de criação de reserva no ambiente publicado (com e sem cold start) e registrar no roteiro.

## 11. Rastreabilidade dos requisitos

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
| RF11 Aprovação | Tela Aprovações |
| RF12 Notificação | Status na interface + e-mail em toda mudança de status |
| RF13 Histórico | `historico_reservas` + tela Histórico de reservas |
| RF14 Relatório PDF | `/api/relatorios/mensal` + jsPDF |
| RF15 Inativar usuários | Inativar/reativar + bloqueio no Auth + cancelamento das reservas futuras |
| RNF001 ≤ 2 s | Verificação de conflito pelo índice GiST numa única inserção; medido no ambiente publicado |
| RNF002 / RNF009 Concorrência e transações | Constraint de exclusão + UPDATE condicional + transações `postgres.js` |
| RNF003 Hash de senha | Supabase Auth (bcrypt) |
| RNF004 Sessão | Logout por inatividade de 30 min, persistido entre abas e reaberturas |
| RNF005 Proteção de dados | Middleware `autenticar` + RLS sem políticas públicas + signup público desligado |
| RNF006 Responsivo | Tailwind + visão de lista e botão "Nova reserva" no celular |
| RNF007 3 cliques | Fluxo de reserva a partir da sala no calendário |
| RNF008 Disponibilidade 99% | Netlify + Supabase gerenciados |
| RNF10 Navegadores | React/Vite com alvos modernos (Chrome, Firefox, Safari, Edge) |
| RNF11 Camadas | routes → controllers → services → repositories |

## 12. Ordem de entrega sugerida

1. Base: repositório, Supabase, migrações, primeiro admin, login, `/api/me`, layout com menu.
2. Essenciais: salas, usuários, criar reserva com regra de conflito.
3. Importantes: calendário completo, aprovação, cancelamento, histórico de status, e-mails, inativação com cancelamento automático, timeout de sessão.
4. Desejáveis: filtros avançados, tela Histórico de reservas com filtros, relatório PDF.

## 13. Fora do escopo

- Cadastro público e recuperação de senha pelo próprio usuário (o admin define uma nova senha pela tela Usuários).
- Reserva feita pelo admin em nome de um professor.
- Reservas recorrentes (ex.: toda segunda-feira).
- Reservas que atravessam a meia-noite, duram vários dias ou ficam fora de 07:00–23:00.
- Notificações por outros canais além de e-mail.
- Aplicativo móvel nativo.
