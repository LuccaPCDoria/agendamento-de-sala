# Sistema de Agendamento de Salas — Especificação de Design

- **Data:** 2026-10-27
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
| `usuario` | Professores | Ver calendário, criar reservas, cancelar as próprias, ver o próprio histórico |
| `admin` | Direção da faculdade | Tudo do professor + aprovar/recusar, cancelar qualquer reserva, cadastrar/editar/inativar salas e usuários, gerar relatório |

- **Não existe cadastro público.** Somente o admin cria contas, definindo uma senha inicial.
- O primeiro admin é criado pelo `supabase/seed.sql` (ou manualmente no painel do Supabase).

## 3. Stack

| Camada | Tecnologia | Hospedagem |
|---|---|---|
| Interface | React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, FullCalendar (gratuito), jsPDF | Netlify |
| API / regras | Node.js + Express + TypeScript, executado como Netlify Function via `serverless-http` | Netlify (mesmo deploy) |
| Validação | Zod — esquemas em `shared/`, usados pelo front e pela API | — |
| Banco | PostgreSQL do Supabase, acessado pela API com `postgres.js` (SQL direto, com transações) | Supabase |
| Autenticação | Supabase Auth (senhas com bcrypt) | Supabase |
| E-mail | Nodemailer + Gmail (senha de app) | — |
| Testes | Vitest | — |

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
- Redirecionamento no `netlify.toml`: `/api/*` → `/.netlify/functions/api/:splat`; demais rotas → `index.html` (SPA).

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
    lib/                  db.ts, email.ts, supabaseAdmin.ts, erros.ts
  shared/                 esquemas Zod e tipos compartilhados
  netlify/functions/api.ts
  supabase/migrations/    *.sql
  supabase/seed.sql
  tests/
  netlify.toml
```

## 5. Banco de dados

Todas as datas/horas são `timestamptz`; a interface exibe e interpreta no fuso `America/Sao_Paulo`.

### Tabelas

**`perfis`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | = `auth.users.id` (FK, `on delete restrict`) |
| nome | text | obrigatório |
| email | text | obrigatório, único |
| papel | enum `papel_usuario` (`usuario`, `admin`) | padrão `usuario` |
| ativo | boolean | padrão `true` |
| criado_em | timestamptz | padrão `now()` |

**`salas`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| nome | text | obrigatório, único |
| tipo | enum `tipo_sala` (`reuniao`, `biblioteca`, `laboratorio`) | obrigatório |
| capacidade | integer | `> 0` |
| recursos | text[] | padrão `{}` |
| ativa | boolean | padrão `true` |
| criado_em | timestamptz | padrão `now()` |

**`reservas`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | |
| sala_id | uuid FK → salas | obrigatório |
| usuario_id | uuid FK → perfis | obrigatório (solicitante) |
| inicio, fim | timestamptz | `CHECK (fim > inicio)` |
| status | enum `status_reserva` (`pendente`, `aprovada`, `recusada`, `cancelada`) | |
| finalidade | text | obrigatório, até 200 caracteres |
| motivo_recusa | text | preenchido apenas quando recusada |
| criado_em, atualizado_em | timestamptz | |

**`historico_reservas`**
| Coluna | Tipo | Regras |
|---|---|---|
| id | bigint identity PK | |
| reserva_id | uuid FK → reservas | |
| status_anterior | status_reserva, nulo | nulo na criação |
| status_novo | status_reserva | |
| alterado_por | uuid FK → perfis | |
| alterado_em | timestamptz | padrão `now()` |

Índices: `reservas (sala_id, inicio)`, `reservas (usuario_id, inicio)`, `reservas (status)`, `historico_reservas (reserva_id)`.

### Regra principal (RF007, RNF002, RNF009)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservas ADD CONSTRAINT reservas_sem_conflito
  EXCLUDE USING gist (sala_id WITH =, tstzrange(inicio, fim, '[)') WITH &&)
  WHERE (status IN ('pendente', 'aprovada'));
```

- Intervalo `[)`: uma reserva que termina às 10h não conflita com outra que começa às 10h.
- Recusadas e canceladas não bloqueiam horário.
- Violação gera erro Postgres `23P01`, convertido pela API em HTTP 409.

### Segurança no banco
- RLS habilitada em todas as tabelas, **sem políticas** para `anon`/`authenticated` → acesso direto pelo navegador é negado (RNF005).
- A API conecta com o usuário do banco via `DATABASE_URL` (pooler em modo transação, porta 6543; `postgres.js` com `prepare: false`).

## 6. Regras de negócio (camada `services/`)

### Reservas
- **Criar:** sala deve existir e estar ativa; `inicio` no futuro; `fim > inicio`; início e fim no **mesmo dia**; duração mínima de 15 minutos; `finalidade` obrigatória.
  - Criada por professor → `pendente`. Criada por admin → `aprovada`.
  - Grava a reserva e a linha de histórico (`null → status inicial`) na **mesma transação**.
- **Aprovar** (admin): somente `pendente` e com `inicio` no futuro → `aprovada`.
- **Recusar** (admin): somente `pendente` → `recusada`, com `motivo_recusa` obrigatório.
- **Cancelar:** o dono ou um admin; somente `pendente` ou `aprovada` com `inicio` no futuro → `cancelada`.
- Toda mudança de status grava em `historico_reservas` na mesma transação.
- **E-mail** ao solicitante (RF12) quando a reserva for aprovada, recusada, ou cancelada por um admin que não é o dono. Enviado **após** o commit; falha de envio é registrada em log e não desfaz a operação.

### Salas
- Nome único. Inativar impede **novas** reservas; reservas futuras já existentes permanecem (o admin cancela manualmente se quiser).

### Usuários
- **Criar** (admin): cria a conta no Supabase Auth (`auth.admin.createUser`, e-mail já confirmado, senha inicial definida pelo admin, mínimo 8 caracteres) e insere em `perfis`. Se a inserção falhar, a conta do Auth é excluída (compensação).
- **Editar** (admin): nome, e-mail, papel e, opcionalmente, uma nova senha (mínimo 8 caracteres); alterações de e-mail e senha são replicadas no Supabase Auth.
- **Inativar** (admin): `ativo = false` + bloqueio no Auth (`ban_duration` longo). **Reativar** remove o bloqueio. Dados e histórico são mantidos (RF15).
- Um admin não pode inativar a si mesmo nem remover o próprio papel de admin.

## 7. API

Todas as rotas exigem token válido e usuário ativo, exceto quando indicado. Respostas em JSON.

| Método e rota | Acesso | Descrição |
|---|---|---|
| `GET /api/me` | logado | Dados e papel do usuário atual |
| `GET /api/usuarios` | admin | Listar usuários |
| `POST /api/usuarios` | admin | Criar usuário |
| `PATCH /api/usuarios/:id` | admin | Editar nome/e-mail/papel/nova senha |
| `POST /api/usuarios/:id/inativar` · `/reativar` | admin | Inativar / reativar |
| `GET /api/salas` | logado | Listar salas (`?incluirInativas=true` só para admin) |
| `POST /api/salas` | admin | Criar sala |
| `PATCH /api/salas/:id` | admin | Editar / inativar / reativar (campo `ativa`) |
| `GET /api/reservas` | logado | Filtros: `inicio`, `fim`, `salaId`, `tipo`, `status`, `minhas=true`. Professor sem `minhas` vê no calendário apenas pendentes/aprovadas de todos |
| `POST /api/reservas` | logado | Criar reserva |
| `POST /api/reservas/:id/aprovar` | admin | Aprovar |
| `POST /api/reservas/:id/recusar` | admin | Recusar (`{ motivo }`) |
| `POST /api/reservas/:id/cancelar` | dono ou admin | Cancelar |
| `GET /api/reservas/:id/historico` | dono ou admin | Mudanças de status |
| `GET /api/relatorios/mensal?mes=AAAA-MM` | admin | Reservas do mês, todas as situações, com totais por status |

### Middlewares
- `autenticar`: valida o JWT com o Supabase (`auth.getUser(token)`), carrega o perfil, rejeita usuário inexistente ou inativo.
- `exigirAdmin`: 403 se `papel !== 'admin'`.
- `tratarErros`: converte erros em `{ "erro": "mensagem" }`.

### Erros
| Situação | HTTP | Mensagem exemplo |
|---|---|---|
| Sem token / token inválido | 401 | "Faça login para continuar." |
| Usuário inativo ou sem permissão | 403 | "Você não tem permissão para esta ação." |
| Registro não encontrado | 404 | "Reserva não encontrada." |
| Dados inválidos (Zod / regra) | 400 | "O horário de término deve ser depois do início." |
| Conflito de horário (`23P01`) | 409 | "Esta sala já está reservada nesse horário." |
| Transição de status inválida | 409 | "Esta reserva não pode mais ser aprovada." |
| Erro inesperado | 500 | "Erro interno. Tente novamente." (detalhes só no log) |

## 8. Interface

### Telas
| Rota | Perfis | Conteúdo |
|---|---|---|
| `/login` | público | E-mail e senha |
| `/` Calendário | todos | FullCalendar com visões dia/semana/mês; filtros por sala, tipo e status; eventos 🟨 pendente / 🟩 aprovada com sala, horário, solicitante e finalidade |
| `/minhas-reservas` | todos | Professor: as próprias reservas; admin: todas, com filtros. Status, motivo de recusa, botão cancelar e histórico de mudanças |
| `/aprovacoes` | admin | Pendentes com aprovar / recusar (motivo obrigatório) |
| `/salas` | admin | Listagem, cadastro, edição, inativar/reativar |
| `/usuarios` | admin | Listagem, cadastro, edição, inativar/reativar |
| `/relatorios` | admin | Seleção de mês e download do PDF (jsPDF) |

- Menu lateral filtrado pelo papel; no celular vira menu hambúrguer.
- Rotas protegidas: não logado → `/login`; professor em tela de admin → "Acesso negado". A API também valida.

### Fluxo de reserva (RNF007 — até 3 cliques)
1. Clicar/arrastar sobre um horário livre no calendário → abre o modal com data e horário preenchidos.
2. Escolher a sala (pré-selecionada se houver filtro de sala ativo) e informar a finalidade.
3. Confirmar.

Em caso de conflito (409), o modal permanece aberto com a mensagem de erro.

### Outros comportamentos
- **Responsivo (RNF006):** em telas estreitas o calendário usa a visão de lista.
- **Inatividade (RNF004):** após 30 minutos sem interação (mouse, teclado, toque), logout automático e redirecionamento para `/login` com aviso "Sessão expirada".
- Após qualquer ação (reservar, aprovar, cancelar), os dados afetados são recarregados automaticamente (TanStack Query).

## 9. Configuração e deploy

- Repositório Git único no GitHub; Netlify conectado à branch `main` com deploy automático.
- Build: `vite build` → `dist/`; functions em `netlify/functions/`.
- Desenvolvimento local: `netlify dev` (front + API).
- Migrações SQL em `supabase/migrations/`, aplicadas com a Supabase CLI.

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
- O Gmail exige verificação em duas etapas ativada para gerar a senha de app; limite diário de envio é suficiente para o projeto.

## 10. Testes

1. **Unitários (Vitest, sem banco):** serviços com repositórios falsos — reserva no passado, fim antes do início, dias diferentes, sala inativa, reserva de admin nasce aprovada, transições de status permitidas e proibidas, permissões de cancelamento, compensação na criação de usuário.
2. **Integração (Vitest + projeto Supabase de testes separado):** repositórios e a constraint de conflito, incluindo:
   - reservas sobrepostas → 409;
   - reservas encostadas (10h–11h e 11h–12h) → ambas aceitas;
   - reserva cancelada libera o horário;
   - **duas criações simultâneas para o mesmo horário → exatamente uma aceita** (demonstração de RF007/RNF002/RNF009).
3. **Roteiro de teste manual** (`docs/roteiro-de-testes.md`): login, reservar, conflito, aprovar, recusar, cancelar, e-mail recebido, inativar usuário e tentar logar, celular.

## 11. Rastreabilidade dos requisitos

| Requisito | Onde é atendido |
|---|---|
| RF001 Login | Supabase Auth + `/login` |
| RF002 Cadastrar usuários | `POST /api/usuarios`, tela Usuários |
| RF003 Controle de acesso | `exigirAdmin`, menu e rotas por papel |
| RF004 / RF005 Salas | `/api/salas`, tela Salas |
| RF006 Criar reserva | `POST /api/reservas`, modal no calendário |
| RF007 Disponibilidade | Constraint `reservas_sem_conflito` + 409 |
| RF008 Cancelar | `POST /api/reservas/:id/cancelar` |
| RF009 Calendário | Tela Calendário (FullCalendar) |
| RF10 Filtros | Filtros do calendário e de Minhas reservas |
| RF11 Aprovação | Tela Aprovações |
| RF12 Notificação | Status na interface + e-mail (Nodemailer/Gmail) |
| RF13 Histórico | `historico_reservas`, Minhas reservas |
| RF14 Relatório PDF | `/api/relatorios/mensal` + jsPDF |
| RF15 Inativar usuários | Inativar/reativar + bloqueio no Auth |
| RNF001 ≤ 2 s | Verificação feita pelo índice GiST em uma única inserção |
| RNF002 / RNF009 Concorrência e transações | Constraint de exclusão + transações `postgres.js` |
| RNF003 Hash de senha | Supabase Auth (bcrypt) |
| RNF004 Sessão | Logout por inatividade de 30 min |
| RNF005 Proteção de dados | Middleware `autenticar` + RLS sem políticas públicas |
| RNF006 Responsivo | Tailwind + visão de lista no celular |
| RNF007 3 cliques | Fluxo de reserva pelo calendário |
| RNF008 Disponibilidade 99% | Netlify + Supabase gerenciados |
| RNF10 Navegadores | React/Vite com alvos modernos (Chrome, Firefox, Safari, Edge) |
| RNF11 Camadas | routes → controllers → services → repositories |

## 12. Ordem de entrega sugerida

1. Base: repositório, Supabase, migrações, login, `/api/me`, layout com menu.
2. Essenciais: salas, usuários, criar reserva com regra de conflito.
3. Importantes: calendário completo, aprovação, cancelamento, histórico de status, e-mail, inativação, timeout de sessão.
4. Desejáveis: filtros avançados, tela de histórico com filtros para admin, relatório PDF.

## 13. Fora do escopo

- Cadastro público e recuperação de senha pelo próprio usuário (o admin define uma nova senha pela tela Usuários).
- Reservas recorrentes (ex.: toda segunda-feira).
- Reservas que atravessam a meia-noite ou duram vários dias.
- Notificações por outros canais além de e-mail.
- Aplicativo móvel nativo.
