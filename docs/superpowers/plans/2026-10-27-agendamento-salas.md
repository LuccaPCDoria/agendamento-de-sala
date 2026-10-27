# Sistema de Agendamento de Salas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir e publicar o sistema web de agendamento de salas (professores reservam, direção aprova, o banco impede conflitos) descrito na especificação.

**Architecture:** SPA React (Vite) e API Express no mesmo repositório, publicados juntos no Netlify (API como Netlify Function v1 via `serverless-http`). A API segue `routes → controllers → services → repositories` e acessa o PostgreSQL do Supabase com `postgres.js`; o Supabase Auth cuida de login/senha. A regra de conflito é uma constraint de exclusão no banco.

**Tech Stack:** TypeScript, React 18, Vite, Tailwind CSS 3, React Router 6, TanStack Query 5, FullCalendar 6, jsPDF + jspdf-autotable, Express 4, serverless-http, postgres (postgres.js 3), @supabase/supabase-js 2, Zod 3, date-fns 4 + date-fns-tz 3, Nodemailer 6, Vitest, supertest, @testing-library/react, Supabase CLI, Netlify CLI.

**Spec:** `docs/superpowers/specs/2026-10-27-agendamento-salas-design.md` — leia a spec inteira antes da primeira tarefa; as tarefas citam suas seções (§N) em vez de repetir o texto.

## Global Constraints

- Todos os textos para o usuário (telas, mensagens de erro da API, e-mails) em **português do Brasil**; as mensagens fixadas pela spec (§7 Erros e as listadas neste plano) são usadas literalmente.
- Imports **relativos** entre `src/`, `server/` e `shared/` (sem aliases de caminho — o bundler das Netlify Functions não os resolve).
- `shared/` não importa nada de `server/` nem de `src/`, e só depende de `zod`, `date-fns` e `date-fns-tz`.
- Fuso de todas as regras de calendário: `America/Sao_Paulo`; horário 07:00–23:00; segunda a sábado; duração mínima 15 min; janela de listagem ≤ 62 dias; finalidade ≤ 200 caracteres (§6, §7).
- `postgres.js` com `max: 1`, `prepare: false`, `idle_timeout: 20`, `transform: postgres.camel`. Dentro de `transacao(fn)` use **somente** os repositórios recebidos em `fn` (§4).
- Datas trafegam na API como ISO 8601 com offset ou `Z`; o servidor responde em ISO UTC.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` e credenciais do Gmail **nunca** são importados por código em `src/`.
- Node 20+ (máquina de desenvolvimento: Node 24). Gerenciador: npm.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Data sem offset ou mal formatada** em `POST /api/reservas` (ex.: `"2026-11-03T10:00"`) → 400 "Data e hora inválidas.", nunca 500 nem interpretação em UTC. Teste na Task 9.
2. **Id que não é UUID** em rotas `/:id` (ex.: `/api/reservas/abc/cancelar`) → 404 com a mensagem do recurso, nunca 500 (o Postgres lançaria `22P02`). Teste na Task 4 (`tratarErros`) e na Task 13.
3. **Texto só com espaços** em finalidade, nome de sala, nome de usuário ou motivo de recusa → 400 (Zod com `trim()` antes de `min(1)`). Teste na Task 2.
4. **Token expirado no meio do uso** (JWT do Supabase vence em 1 h) → `src/lib/api.ts` lê a sessão atual a cada chamada (`supabase.auth.getSession()`), que é renovada automaticamente; o usuário não é deslogado por isso. Teste na Task 6.
5. **Duplo clique em "Confirmar"** no modal de reserva → uma única requisição (botão desabilitado enquanto envia), evitando um 409 contra a própria reserva. Teste na Task 12.

---

## Estrutura de arquivos

```
agendamento-salas/
  package.json, tsconfig.json, tsconfig.server.json, vite.config.ts,
  vitest.config.ts, vitest.integracao.config.ts, tailwind.config.js,
  postcss.config.js, netlify.toml, .env.example, .gitignore, index.html
  shared/
    constantes.ts        constantes de negócio (§6) e tipos de domínio
    tipos.ts             DTOs da API
    horario.ts           validarJanelaReserva (regras de horário, fuso)
    esquemas.ts          esquemas Zod (corpo e query das rotas)
  server/
    app.ts               criarApp(deps) — Express, mount duplo, rotas
    dependencias.ts      DependenciasApp + dependenciasPadrao() (lê env)
    tipos.ts             linhas do banco (datas como Date) + Express.Request.usuario
    lib/db.ts            sql, criarTransacao, Repos, criarRepos
    lib/erros.ts         ErroApp e atalhos
    lib/dto.ts           paraReservaDTO
    lib/datas.ts         limitesDoMes
    lib/supabaseAdmin.ts criarAuthAdmin (AuthAdmin) + verificarToken
    lib/email.ts         criarNotificador, montarEmail, escaparHtml
    lib/notificador.ts   tipos Notificador/EventoEmail + notificadorNulo
    middlewares/         autenticar.ts, exigirAdmin.ts, tratarErros.ts
    repositories/        perfis.ts, salas.ts, reservas.ts, historico.ts
    services/            salas.ts, usuarios.ts, reservas.ts, notificacoes.ts, relatorios.ts
    controllers/         me.ts, salas.ts, usuarios.ts, reservas.ts, relatorios.ts
    routes/              index.ts (monta todos), salas.ts, usuarios.ts, reservas.ts, relatorios.ts
  netlify/functions/api.ts
  supabase/migrations/20261027000000_esquema_inicial.sql
  supabase/salas-exemplo.sql
  src/
    main.tsx, App.tsx, index.css
    lib/supabase.ts, lib/api.ts
    auth/AuthProvider.tsx, auth/traduzirErroLogin.ts, auth/inatividade.ts, auth/useInatividade.ts
    components/Layout.tsx, components/menu.ts, components/RotaProtegida.tsx
    calendario/eventos.ts, calendario/ModalNovaReserva.tsx, calendario/ModalDetalhes.tsx
    consultas/           hooks TanStack Query: salas.ts, usuarios.ts, reservas.ts, relatorios.ts
    pages/               Login, Calendario, Reservas, Aprovacoes, Salas, Usuarios, Relatorios (.tsx)
    relatorios/gerarPdf.ts
  tests/
    unit/                testes sem banco (server/ e shared/)
    integracao/          testes contra o projeto Supabase de testes
    integracao/ajuda.ts  conexão, limpeza e usuários de teste
  docs/primeiro-admin.md, docs/roteiro-de-testes.md
```

Testes de front ficam ao lado do arquivo (`src/**/*.test.ts(x)`), com `// @vitest-environment jsdom` no topo.

---

## Fase 1 — Base

### Task 1: Estrutura do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, `vitest.config.ts`, `vitest.integracao.config.ts`, `tailwind.config.js`, `postcss.config.js`, `netlify.toml`, `.env.example`, `.gitignore`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Test: `tests/unit/sanidade.test.ts`

**Interfaces:**
- Produces: scripts npm `dev` (`netlify dev`), `build` (`tsc -p tsconfig.server.json --noEmit && vite build`), `test` (`vitest run`), `test:integracao` (`vitest run -c vitest.integracao.config.ts`), `typecheck` (`tsc --noEmit && tsc -p tsconfig.server.json --noEmit`).

- [ ] **Step 1: Criar o projeto Vite e instalar dependências**

Em `D:\pessoal\agendamento-salas` (repositório git já existente): `npm create vite@latest . -- --template react-ts` (manter `docs/`), depois:

```bash
npm i react-router-dom@6 @tanstack/react-query@5 @supabase/supabase-js@2 zod@3 date-fns@4 date-fns-tz@3 @fullcalendar/react@6 @fullcalendar/core@6 @fullcalendar/daygrid@6 @fullcalendar/timegrid@6 @fullcalendar/list@6 @fullcalendar/interaction@6 jspdf jspdf-autotable express@4 serverless-http postgres@3 nodemailer@6
npm i -D tailwindcss@3 postcss autoprefixer vitest supertest @types/supertest @types/express@4 @types/nodemailer @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom netlify-cli supabase dotenv
```

- [ ] **Step 2: Configurar**

- `netlify.toml`: `[build] command = "npm run build"`, `publish = "dist"`; `[functions] directory = "netlify/functions"`, `node_bundler = "esbuild"`; `[dev] command = "vite"`, `targetPort = 5173`; redirects nesta ordem: `/api/*` → `/.netlify/functions/api/:splat` (`status = 200`), depois `/*` → `/index.html` (`status = 200`).
- `tsconfig.json` cobre `src` e `shared` (jsx react-jsx); `tsconfig.server.json` cobre `server`, `shared`, `netlify`, `tests` (module NodeNext/ESNext, `types: ["node"]`).
- `vitest.config.ts`: `include: ['tests/unit/**/*.test.ts', 'src/**/*.test.{ts,tsx}']`, ambiente `node`, `setupFiles` com `@testing-library/jest-dom/vitest`.
- `vitest.integracao.config.ts`: `include: ['tests/integracao/**/*.test.ts']`, `fileParallelism: false`, `testTimeout: 20000`, `setupFiles: ['dotenv/config']` lendo `.env.test` (via `process.env.DOTENV_CONFIG_PATH = '.env.test'` no config).
- Tailwind: `content: ['./index.html', './src/**/*.{ts,tsx}']`; `src/index.css` com as três diretivas.
- `.env.example` com todas as variáveis de §9 mais as de teste: `TEST_DATABASE_URL`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`. `.gitignore` inclui `.env`, `.env.test`, `.netlify`, `dist`, `node_modules`.
- `src/App.tsx` provisório renderiza "Agendamento de Salas".

- [ ] **Step 3: Teste de sanidade**

```ts
// tests/unit/sanidade.test.ts
import { describe, it, expect } from 'vitest';
describe('sanidade', () => { it('roda o vitest', () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 4: Verificar**

Run: `npm test` → PASS (1 teste). Run: `npm run build` → gera `dist/` sem erros.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: estrutura inicial do projeto"
```

---

### Task 2: Regras e esquemas compartilhados

**Files:**
- Create: `shared/constantes.ts`, `shared/tipos.ts`, `shared/horario.ts`, `shared/esquemas.ts`
- Test: `tests/unit/horario.test.ts`, `tests/unit/esquemas.test.ts`

**Interfaces:**
- Produces (`shared/constantes.ts`): `FUSO = 'America/Sao_Paulo'`, `HORA_ABERTURA = '07:00'`, `HORA_FECHAMENTO = '23:00'`, `DIAS_FUNCIONAMENTO = [1,2,3,4,5,6]` (0 = domingo), `DURACAO_MINIMA_MIN = 15`, `JANELA_MAXIMA_DIAS = 62`, `FINALIDADE_MAX = 200`; tipos `Papel`, `TipoSala`, `StatusReserva`, `StatusFiltro = StatusReserva | 'expirada'`.
- Produces (`shared/tipos.ts`):
  ```ts
  interface Perfil { id: string; nome: string; email: string; papel: Papel; ativo: boolean }
  interface Sala { id: string; nome: string; tipo: TipoSala; capacidade: number; recursos: string[]; ativa: boolean }
  interface ReservaDTO { id: string; salaId: string; salaNome: string; salaTipo: TipoSala; usuarioId: string;
    solicitanteNome: string; inicio: string; fim: string; status: StatusReserva; finalidade: string;
    motivoRecusa: string | null; expirada: boolean }
  interface EntradaHistoricoDTO { statusAnterior: StatusReserva | null; statusNovo: StatusReserva; alteradoPorNome: string; alteradoEm: string }
  interface RelatorioMensalDTO { mes: string; reservas: ReservaDTO[]; totais: Record<StatusFiltro, number> }
  ```
- Produces (`shared/horario.ts`): `validarJanelaReserva(inicio: Date, fim: Date, agora: Date): string | null` — devolve a primeira mensagem de erro (ordem abaixo) ou `null`.
- Produces (`shared/esquemas.ts`): `esquemaCriarReserva`, `esquemaRecusar`, `esquemaSala`, `esquemaEditarSala` (parcial), `esquemaCriarUsuario`, `esquemaEditarUsuario`, `esquemaListarReservas`, `esquemaMes`, `esquemaUuid`; tipos inferidos `DadosCriarReserva`, `DadosSala`, `DadosCriarUsuario`, `DadosEditarUsuario`, `FiltroReservas`.

Mensagens de `validarJanelaReserva`, verificadas nesta ordem:
1. `fim <= inicio` → "O horário de término deve ser depois do início."
2. `inicio <= agora` → "Não é possível reservar no passado."
3. datas diferentes no fuso → "A reserva deve começar e terminar no mesmo dia."
4. domingo → "Reservas só podem ser feitas de segunda a sábado."
5. início antes de 07:00 ou fim depois de 23:00 (fuso) → "Reservas só podem ser feitas entre 07:00 e 23:00."
6. duração < 15 min → "A reserva deve ter pelo menos 15 minutos."

Regras dos esquemas: textos com `.trim().min(1, ...)`; e-mail `.trim().toLowerCase().email("E-mail inválido.")`; senha `.min(8, "A senha deve ter pelo menos 8 caracteres.")`; datas `z.string().datetime({ offset: true, message: "Data e hora inválidas." })`; `finalidade` máx. 200 ("A finalidade deve ter no máximo 200 caracteres."); `capacidade` inteiro > 0; `esquemaListarReservas`: `inicio`, `fim` obrigatórios, `salaId?` uuid, `tipo?`, `status?` (string separada por vírgula → `StatusFiltro[]`, valores inválidos rejeitados), `minhas?` (`"true"` → `true`), com refinamento `fim > inicio` e `fim - inicio ≤ 62 dias` ("O período consultado deve ter no máximo 62 dias."); `esquemaMes`: regex `^\d{4}-(0[1-9]|1[0-2])$` ("Mês inválido."); `esquemaEditarUsuario`: `nome?`, `email?`, `papel?`, `novaSenha?`.

- [ ] **Step 1: Escrever os testes**

```ts
// tests/unit/horario.test.ts — datas com offset -03:00 (Brasília)
const agora = new Date('2026-11-02T08:00:00-03:00'); // segunda
const v = (i: string, f: string) => validarJanelaReserva(new Date(i), new Date(f), agora);
it('aceita segunda 10h–11h', () => expect(v('2026-11-03T10:00:00-03:00', '2026-11-03T11:00:00-03:00')).toBeNull());
it('aceita 07:00–07:15 e 22:00–23:00 (limites)', () => {
  expect(v('2026-11-03T07:00:00-03:00', '2026-11-03T07:15:00-03:00')).toBeNull();
  expect(v('2026-11-03T22:00:00-03:00', '2026-11-03T23:00:00-03:00')).toBeNull();
});
it('rejeita fim antes do início', () => expect(v('2026-11-03T11:00:00-03:00', '2026-11-03T10:00:00-03:00')).toBe('O horário de término deve ser depois do início.'));
it('rejeita passado', () => expect(v('2026-11-02T07:30:00-03:00', '2026-11-02T09:00:00-03:00')).toBe('Não é possível reservar no passado.'));
it('rejeita dias diferentes', () => expect(v('2026-11-03T22:30:00-03:00', '2026-11-04T07:30:00-03:00')).toBe('A reserva deve começar e terminar no mesmo dia.'));
it('reserva às 22h em Brasília (01h UTC do dia seguinte) é mesmo dia', () => expect(v('2026-11-04T01:00:00Z', '2026-11-04T01:45:00Z')).toBeNull());
it('rejeita domingo', () => expect(v('2026-11-08T10:00:00-03:00', '2026-11-08T11:00:00-03:00')).toBe('Reservas só podem ser feitas de segunda a sábado.'));
it('aceita sábado', () => expect(v('2026-11-07T10:00:00-03:00', '2026-11-07T11:00:00-03:00')).toBeNull());
it('rejeita 06:59 e fim 23:01', () => {
  expect(v('2026-11-03T06:59:00-03:00', '2026-11-03T08:00:00-03:00')).toBe('Reservas só podem ser feitas entre 07:00 e 23:00.');
  expect(v('2026-11-03T22:00:00-03:00', '2026-11-03T23:01:00-03:00')).toBe('Reservas só podem ser feitas entre 07:00 e 23:00.');
});
it('rejeita 14 minutos', () => expect(v('2026-11-03T10:00:00-03:00', '2026-11-03T10:14:00-03:00')).toBe('A reserva deve ter pelo menos 15 minutos.'));
```

```ts
// tests/unit/esquemas.test.ts
it('finalidade só com espaços é rejeitada', () => expect(esquemaCriarReserva.safeParse({ salaId: UUID, inicio: I, fim: F, finalidade: '   ' }).success).toBe(false));
it('data sem offset é rejeitada com mensagem', () => {
  const r = esquemaCriarReserva.safeParse({ salaId: UUID, inicio: '2026-11-03T10:00', fim: F, finalidade: 'Aula' });
  expect(r.success).toBe(false); expect(r.error!.issues[0].message).toBe('Data e hora inválidas.');
});
it('normaliza e-mail', () => expect(esquemaCriarUsuario.parse({ nome: 'Ana', email: '  Ana@X.COM ', senha: '12345678', papel: 'usuario' }).email).toBe('ana@x.com'));
it('nome de sala só com espaços é rejeitado', () => expect(esquemaSala.safeParse({ nome: ' ', tipo: 'reuniao', capacidade: 10, recursos: [] }).success).toBe(false));
it('motivo de recusa só com espaços é rejeitado', () => expect(esquemaRecusar.safeParse({ motivo: '  ' }).success).toBe(false));
it('listagem: status em lista e minhas', () => expect(esquemaListarReservas.parse({ inicio: I, fim: F, status: 'recusada,cancelada', minhas: 'true' })).toMatchObject({ status: ['recusada', 'cancelada'], minhas: true }));
it('listagem: janela acima de 62 dias rejeitada', () => expect(esquemaListarReservas.safeParse({ inicio: '2026-11-01T00:00:00Z', fim: '2027-01-03T00:00:00Z' }).success).toBe(false));
it('mês 2026-13 rejeitado', () => expect(esquemaMes.safeParse('2026-13').success).toBe(false));
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test` → FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar** os quatro arquivos de `shared/`. Em `horario.ts`, use `formatInTimeZone(data, FUSO, 'yyyy-MM-dd')`, `'i'` (dia ISO, 7 = domingo) e `'HH:mm'` de `date-fns-tz` — nunca `getDate()`/`getHours()`.

- [ ] **Step 4: Rodar e ver passar** — Run: `npm test` → PASS.

- [ ] **Step 5: Commit** — `git add shared tests/unit && git commit -m "feat: regras de horário e esquemas compartilhados"`

---

### Task 3: Banco de dados no Supabase

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/20261027000000_esquema_inicial.sql`, `supabase/salas-exemplo.sql`, `docs/primeiro-admin.md`, `tests/integracao/ajuda.ts`
- Test: `tests/integracao/constraint.test.ts`

**Interfaces:**
- Produces (`tests/integracao/ajuda.ts`): `sqlTeste` (cliente postgres para `TEST_DATABASE_URL`, `max: 1`, `prepare: false`, `transform: postgres.camel`), `novoClienteSql(): postgres.Sql` (cliente separado, para concorrência), `limparBanco(): Promise<void>` (apaga `historico_reservas`, `reservas`, `salas`, perfis e contas do Auth com e-mail terminando em `@teste.local`), `criarSalaTeste(nome?: string): Promise<Sala>`, `criarUsuarioTeste(papel: Papel): Promise<{ perfil: Perfil; token: string }>` (cria no Auth com a service role do projeto de testes, insere em `perfis`, faz `signInWithPassword` com a anon key e devolve o `access_token`).
- Produces (banco): nomes fixos usados pelo `tratarErros`: constraint `reservas_sem_conflito`, índices únicos `perfis_email_unico` (em `lower(email)`) e `salas_nome_unico` (em `lower(nome)`).

- [ ] **Step 1: Pré-requisitos manuais (feitos por você, Lucca)**

1. Criar **dois** projetos no Supabase: `agendamento-salas` (produção) e `agendamento-salas-teste`.
2. Em ambos: Authentication → Sign In / Providers → desligar **Allow new users to sign up**; manter **Secure email change** ligado.
3. Copiar URL, anon key, service role key e as connection strings (pooler **transação** porta 6543 para `DATABASE_URL`; pooler **sessão** porta 5432 para rodar migrações) para `.env` (produção) e `.env.test` (testes, nomes `TEST_*`).

- [ ] **Step 2: Escrever a migração** conforme §5 da spec: extensão `btree_gist WITH SCHEMA extensions`; enums `papel_usuario`, `tipo_sala`, `status_reserva`; tabelas `perfis`, `salas`, `reservas`, `historico_reservas` com todos os tipos, defaults, `not null`, `CHECK (fim > inicio)`, `CHECK (capacidade > 0)`, `CHECK (char_length(finalidade) <= 200)`; FK `perfis.id → auth.users(id) on delete restrict`; índices `perfis_email_unico`, `salas_nome_unico`, `reservas (usuario_id, inicio)`, `reservas (status)`, `historico_reservas (reserva_id)`; a constraint `reservas_sem_conflito` exatamente como em §5; `alter table ... enable row level security` nas quatro tabelas, sem políticas.

- [ ] **Step 3: Escrever o teste da constraint**

```ts
// tests/integracao/constraint.test.ts — insere direto com sqlTeste
beforeEach(limparBanco);
const ins = (sala, usuario, i, f, status = 'pendente') => sqlTeste`insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade) values (${sala}, ${usuario}, ${i}, ${f}, ${status}, 'x')`;
it('sobreposição na mesma sala → 23P01', async () => {
  await ins(s.id, u.id, '2026-11-03T13:00Z', '2026-11-03T14:00Z');
  await expect(ins(s.id, u.id, '2026-11-03T13:30Z', '2026-11-03T14:30Z')).rejects.toMatchObject({ code: '23P01' });
});
it('reservas encostadas são aceitas', async () => {
  await ins(s.id, u.id, '2026-11-03T13:00Z', '2026-11-03T14:00Z');
  await expect(ins(s.id, u.id, '2026-11-03T14:00Z', '2026-11-03T15:00Z')).resolves.toBeDefined();
});
it('cancelada e recusada não bloqueiam', async () => {
  await ins(s.id, u.id, '2026-11-03T13:00Z', '2026-11-03T14:00Z', 'cancelada');
  await ins(s.id, u.id, '2026-11-03T13:00Z', '2026-11-03T14:00Z', 'recusada');
  await expect(ins(s.id, u.id, '2026-11-03T13:00Z', '2026-11-03T14:00Z')).resolves.toBeDefined();
});
it('salas diferentes não conflitam', async () => { /* mesmo horário em s e s2 → ambos aceitos */ });
it('nome de sala duplicado ignora maiúsculas → 23505 salas_nome_unico', async () => {
  await criarSalaTeste('Lab 1');
  await expect(criarSalaTeste('LAB 1')).rejects.toMatchObject({ code: '23505', constraint_name: 'salas_nome_unico' });
});
```

- [ ] **Step 4: Aplicar a migração no projeto de testes e rodar**

Run: `npx supabase db push --db-url "<pooler sessão 5432 do projeto de teste>"` → migração aplicada.
Run: `npm run test:integracao` → PASS.

- [ ] **Step 5: Aplicar em produção e documentar o primeiro admin**

Run: `npx supabase db push --db-url "<pooler sessão 5432 de produção>"`.
Escrever `docs/primeiro-admin.md` com o procedimento de §9 (Add user com Auto Confirm + o `insert into perfis ... 'admin'`) e `supabase/salas-exemplo.sql` com 4 salas (2 de reunião, 1 biblioteca, 1 laboratório). Executar ambos em produção.

- [ ] **Step 6: Commit** — `git add supabase docs tests/integracao && git commit -m "feat: esquema do banco com regra de conflito"`

---

### Task 4: Núcleo da API

**Files:**
- Create: `server/tipos.ts`, `server/lib/db.ts`, `server/lib/erros.ts`, `server/lib/dto.ts`, `server/lib/notificador.ts`, `server/middlewares/tratarErros.ts`, `server/dependencias.ts`, `server/routes/index.ts`, `server/app.ts`, `netlify/functions/api.ts`, `server/repositories/perfis.ts`, `server/repositories/salas.ts`, `server/repositories/reservas.ts`, `server/repositories/historico.ts` (os repositórios começam com as funções que a Task 3/5 precisam e crescem nas tarefas seguintes)
- Test: `tests/unit/tratarErros.test.ts`, `tests/unit/app.test.ts`, `tests/unit/fakes.ts`

**Interfaces:**
- Produces (`server/tipos.ts`): `Reserva` (como `ReservaDTO` sem campos de junção e com `inicio`, `fim`, `criadoEm`, `atualizadoEm` como `Date`), `ReservaDetalhada extends Reserva { salaNome; salaTipo; solicitanteNome; solicitanteEmail }`; augmentação `Express.Request { usuario?: Perfil }`.
- Produces (`server/lib/erros.ts`): `class ErroApp extends Error { constructor(readonly status: number, message: string) }`; atalhos `invalido(msg)` 400, `proibido()` 403 "Você não tem permissão para esta ação.", `naoEncontrado(msg)` 404, `conflito(msg)` 409.
- Produces (`server/lib/db.ts`):
  ```ts
  type Executor = postgres.Sql | postgres.TransactionSql;
  interface Repos { perfis: RepoPerfis; salas: RepoSalas; reservas: RepoReservas; historico: RepoHistorico }
  type Transacao = <T>(fn: (repos: Repos) => Promise<T>) => Promise<T>;
  function criarSql(url: string): postgres.Sql;           // max 1, prepare false, idle_timeout 20, camel
  function criarRepos(db: Executor): Repos;
  function criarTransacao(sql: postgres.Sql): Transacao;  // sql.begin(tx => fn(criarRepos(tx)))
  ```
- Produces (`server/lib/notificador.ts`): `type TipoEmail = 'criada' | 'confirmada' | 'aprovada' | 'recusada' | 'cancelada'`; `interface EventoEmail { para: string; nome: string; tipo: TipoEmail; reservas: ReservaDetalhada[] }`; `type Notificador = (eventos: EventoEmail[]) => Promise<void>` (nunca rejeita); `notificadorNulo: Notificador`.
- Produces (`server/lib/dto.ts`): `paraReservaDTO(r: ReservaDetalhada, agora: Date): ReservaDTO` (`expirada = status === 'pendente' && inicio <= agora`; omite `solicitanteEmail`).
- Produces (`server/dependencias.ts`):
  ```ts
  interface DependenciasApp {
    verificarToken: (token: string) => Promise<{ id: string; email: string } | null>;
    repos: Repos;          // ligados ao sql base — só para leituras fora de transação
    transacao: Transacao;
    authAdmin: AuthAdmin;  // interface declarada aqui; implementação real na Task 5
    notificar: Notificador;
    agora: () => Date;
  }
  function dependenciasPadrao(): DependenciasApp;  // lê process.env; notificar = notificadorNulo até a Task 14
  ```
  A interface `AuthAdmin` (assinaturas na Task 5) é declarada em `server/dependencias.ts` já nesta tarefa; até a Task 5, `dependenciasPadrao` usa uma implementação que lança `Error('não implementado')`.
- Produces (`server/app.ts`): `criarApp(deps: DependenciasApp): express.Express` — `express.json()`, router de `routes/index.ts` montado em `['/api', '/.netlify/functions/api']`, 404 JSON `{ erro: 'Rota não encontrada.' }`, `tratarErros` por último.
- Produces (`tests/unit/fakes.ts`): `reposFalsos(): Repos` (cada método é `vi.fn()`), `depsFalsas(sobrescritas?: Partial<DependenciasApp>): DependenciasApp` (transacao = `fn => fn(repos)` com os mesmos repos, `agora` fixo em `2026-11-02T08:00:00-03:00`, `notificar = vi.fn()`).
- `netlify/functions/api.ts`: `export const handler = serverless(criarApp(dependenciasPadrao()))`.

Mapeamento do `tratarErros(err, req, res, next)` → `res.status(s).json({ erro })`:
| Entrada | Status | Mensagem |
|---|---|---|
| `ErroApp` | `err.status` | `err.message` |
| `ZodError` | 400 | primeira `issue.message` |
| `code === '23P01'` | 409 | "Esta sala já está reservada nesse horário." |
| `code === '23505'` e `constraint_name === 'perfis_email_unico'` | 409 | "Já existe um usuário com este e-mail." |
| `code === '23505'` e `constraint_name === 'salas_nome_unico'` | 409 | "Já existe uma sala com este nome." |
| `code === '40P01'` | 409 | "Operação concorrente detectada. Tente novamente." |
| qualquer outro | 500 | "Erro interno. Tente novamente." (`console.error` com o erro) |

- [ ] **Step 1: Testes**

```ts
// tests/unit/tratarErros.test.ts — monta um app mínimo que lança o erro e chama tratarErros
it.each([
  [new ErroApp(404, 'Reserva não encontrada.'), 404, 'Reserva não encontrada.'],
  [{ code: '23P01' }, 409, 'Esta sala já está reservada nesse horário.'],
  [{ code: '23505', constraint_name: 'perfis_email_unico' }, 409, 'Já existe um usuário com este e-mail.'],
  [{ code: '23505', constraint_name: 'salas_nome_unico' }, 409, 'Já existe uma sala com este nome.'],
  [{ code: '40P01' }, 409, 'Operação concorrente detectada. Tente novamente.'],
  [new Error('boom'), 500, 'Erro interno. Tente novamente.'],
])('mapeia %o', async (erro, status, msg) => { /* supertest → expect(res.status).toBe(status); expect(res.body).toEqual({ erro: msg }) */ });
it('ZodError vira 400 com a primeira mensagem', ...);
```

```ts
// tests/unit/app.test.ts
it('rota inexistente → 404 JSON', async () => {
  const res = await request(criarApp(depsFalsas())).get('/api/nada');
  expect(res.status).toBe(404); expect(res.body).toEqual({ erro: 'Rota não encontrada.' });
});
it('responde no caminho /.netlify/functions/api também', async () => {
  const res = await request(criarApp(depsFalsas())).get('/.netlify/functions/api/nada');
  expect(res.body).toEqual({ erro: 'Rota não encontrada.' });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.
- [ ] **Step 3: Implementar** os arquivos listados (repositórios ainda vazios além do necessário para tipar `Repos`).
- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS; `npm run typecheck` → sem erros.
- [ ] **Step 5: Commit** — `git add server netlify tests/unit && git commit -m "feat: núcleo da API (erros, banco, app)"`

---

### Task 5: Autenticação na API e `/api/me`

**Files:**
- Create: `server/lib/supabaseAdmin.ts`, `server/middlewares/autenticar.ts`, `server/middlewares/exigirAdmin.ts`, `server/controllers/me.ts`
- Modify: `server/routes/index.ts`, `server/repositories/perfis.ts`, `server/dependencias.ts`
- Test: `tests/unit/autenticar.test.ts`, `tests/integracao/me.test.ts`

**Interfaces:**
- Produces (`server/lib/supabaseAdmin.ts`, implementando a interface declarada em `server/dependencias.ts`):
  ```ts
  interface AuthAdmin {
    criarUsuario(email: string, senha: string): Promise<string>;                 // id; email_confirm: true
    atualizarUsuario(id: string, dados: { email?: string; senha?: string }): Promise<void>; // email_confirm: true
    excluirUsuario(id: string): Promise<void>;
    definirBloqueio(id: string, bloqueado: boolean): Promise<void>;              // ban_duration '876000h' | 'none'
  }
  function criarAuthAdmin(url: string, serviceRoleKey: string): { authAdmin: AuthAdmin; verificarToken: DependenciasApp['verificarToken'] };
  ```
  Erro `email_exists`/`422` do Auth → `conflito('Já existe um usuário com este e-mail.')`. Cliente com `auth: { persistSession: false, autoRefreshToken: false }`.
- Produces (`RepoPerfis`): `buscarPorId(id: string): Promise<Perfil | null>`.
- Produces: `autenticar(deps: DependenciasApp): RequestHandler` (preenche `req.usuario`), `exigirAdmin: RequestHandler`; `GET /api/me` → `Perfil`. Todas as rotas exceto o 404 passam por `autenticar`.

Regras do `autenticar`: sem header `Authorization: Bearer <token>` ou token inválido → 401 "Faça login para continuar."; perfil inexistente ou `ativo = false` → 403 (`proibido()`); se `user.email !== perfil.email`, `console.warn` e segue.

- [ ] **Step 1: Testes unitários** (com `depsFalsas`, `verificarToken` e `repos.perfis.buscarPorId` como `vi.fn`)

```ts
it('sem token → 401', async () => expect((await request(app).get('/api/me')).body).toEqual({ erro: 'Faça login para continuar.' }));
it('token inválido → 401', ...);           // verificarToken resolve null
it('perfil inativo → 403', ...);           // { ...perfil, ativo: false }
it('perfil inexistente → 403', ...);
it('ok → 200 com o perfil', async () => { /* expect(res.body).toEqual(perfilAtivo) */ });
it('exigirAdmin: professor → 403', ...);   // rota de teste montada só no teste
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Teste de integração** — `tests/integracao/me.test.ts`: com `criarUsuarioTeste('admin')`, `GET /api/me` (app criado com dependências reais apontando para o projeto de testes) → 200 e `papel: 'admin'`. Construa as dependências de integração num helper `depsIntegracao()` em `tests/integracao/ajuda.ts` (usa `criarSql(TEST_DATABASE_URL)` — portanto `max: 1`, para detectar o uso indevido do `sql` dentro de transações — e `criarAuthAdmin` com as chaves `TEST_*`).
- [ ] **Step 5: Rodar** — `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 6: Commit** — `git commit -am "feat: autenticação na API e /api/me"` (adicione os arquivos novos antes).

---

### Task 6: Front-end base (login, layout, rotas protegidas)

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/api.ts`, `src/auth/AuthProvider.tsx`, `src/auth/traduzirErroLogin.ts`, `src/components/Layout.tsx`, `src/components/menu.ts`, `src/components/RotaProtegida.tsx`, `src/pages/Login.tsx`, `src/pages/Calendario.tsx` (placeholder), demais páginas de §8 como placeholders
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/lib/api.test.ts`, `src/auth/traduzirErroLogin.test.ts`, `src/components/menu.test.ts`

**Interfaces:**
- Produces: `api<T>(caminho: string, opcoes?: { metodo?: 'GET' | 'POST' | 'PATCH'; corpo?: unknown; query?: Record<string, string | undefined> }): Promise<T>` — prefixa `/api`, pega o token com `supabase.auth.getSession()` **a cada chamada**, lança `class ErroApi extends Error { status: number }` com `message = body.erro`.
- Produces: `useAuth(): { perfil: Perfil | null; carregando: boolean; entrar(email: string, senha: string): Promise<string | null /* mensagem de erro */>; sair(): Promise<void> }` — após login, busca `/api/me`.
- Produces: `traduzirErroLogin(mensagem: string): string` — "Invalid login credentials" → "E-mail ou senha incorretos."; contém "banned" → "Usuário inativo. Procure a direção."; outro → "Não foi possível entrar. Tente novamente."
- Produces: `itensDoMenu(papel: Papel): { rota: string; rotulo: string }[]` — professor: Calendário (`/`), Minhas reservas (`/reservas`); admin: + Aprovações, Salas, Usuários, Relatórios.
- Produces: `<RotaProtegida somenteAdmin?>` — sem perfil → `<Navigate to="/login" />`; professor em rota admin → página "Acesso negado".
- Rotas do `App.tsx` conforme §8; `QueryClientProvider` em `main.tsx`. Layout: menu lateral em telas ≥ `md`, botão hambúrguer abaixo disso; nome do usuário e botão "Sair".

- [ ] **Step 1: Testes**

```ts
// src/lib/api.test.ts (@vitest-environment jsdom) — mock de ./supabase e de fetch
it('usa o token da sessão atual em cada chamada', async () => {
  getSession.mockResolvedValueOnce({ data: { session: { access_token: 'A' } } })
            .mockResolvedValueOnce({ data: { session: { access_token: 'B' } } });
  await api('/me'); await api('/me');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer A');
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer B');
});
it('lança ErroApi com a mensagem do servidor', async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ erro: 'Esta sala já está reservada nesse horário.' }), { status: 409 }));
  await expect(api('/reservas', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({ status: 409, message: 'Esta sala já está reservada nesse horário.' });
});
// traduzirErroLogin.test.ts: os três casos acima
// menu.test.ts: itensDoMenu('usuario') tem 2 itens e não contém '/salas'; itensDoMenu('admin') tem 6
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** — `npm test` → PASS; `npm run build` → OK.
- [ ] **Step 5: Verificação manual** — `npm run dev`, entrar com o admin criado na Task 3: menu mostra 6 itens; senha errada mostra "E-mail ou senha incorretos."
- [ ] **Step 6: Commit** — `git add src && git commit -m "feat: login, layout e rotas protegidas"`

---

## Fase 2 — Essenciais

### Task 7: API de salas (listar, criar, editar)

**Files:**
- Create: `server/services/salas.ts`, `server/controllers/salas.ts`, `server/routes/salas.ts`
- Modify: `server/repositories/salas.ts`, `server/routes/index.ts`
- Test: `tests/unit/servicoSalas.test.ts`, `tests/integracao/salas.test.ts`

**Interfaces:**
- Produces (`RepoSalas`): `listar(incluirInativas: boolean): Promise<Sala[]>` (ordem por nome), `buscarPorId(id): Promise<Sala | null>`, `buscarAtivaParaReserva(id): Promise<Sala | null>` (`... AND ativa FOR SHARE`), `inserir(d: DadosSala): Promise<Sala>`, `atualizar(id, d: Partial<DadosSala>): Promise<Sala | null>`, `definirAtiva(id, ativa: boolean): Promise<Sala | null>`.
- Produces: `criarServicoSalas(deps: DependenciasApp)` → `{ listar(usuario: Perfil, incluirInativas: boolean): Promise<Sala[]>; criar(d: DadosSala): Promise<Sala>; editar(id: string, d: Partial<DadosSala>): Promise<Sala> }` (`inativar`/`reativar` chegam na Task 15). `incluirInativas` é ignorado para professor. Editar inexistente → 404 "Sala não encontrada."
- Rotas: `GET /api/salas?incluirInativas=true` (logado), `POST /api/salas` e `PATCH /api/salas/:id` (admin).

- [ ] **Step 1: Testes**

```ts
// unit
it('professor nunca recebe inativas', async () => { await servico.listar(professor, true); expect(repos.salas.listar).toHaveBeenCalledWith(false); });
it('editar inexistente → 404', async () => { repos.salas.atualizar.mockResolvedValue(null); await expect(servico.editar(ID, { nome: 'X' })).rejects.toMatchObject({ status: 404, message: 'Sala não encontrada.' }); });
// integracao (supertest + depsIntegracao)
it('admin cria sala → 201', ...);
it('nome duplicado com outra caixa → 409 "Já existe uma sala com este nome."', ...);
it('professor tenta criar → 403', ...);
it('capacidade 0 → 400', ...);
```

- [ ] **Step 2: Falhar** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: API de salas"` (com os arquivos novos adicionados).

---

### Task 8: API de usuários (listar, criar, editar)

**Files:**
- Create: `server/services/usuarios.ts`, `server/controllers/usuarios.ts`, `server/routes/usuarios.ts`
- Modify: `server/repositories/perfis.ts`, `server/routes/index.ts`
- Test: `tests/unit/servicoUsuarios.test.ts`, `tests/integracao/usuarios.test.ts`

**Interfaces:**
- Produces (`RepoPerfis`): `listar(): Promise<Perfil[]>`, `inserir(p: Omit<Perfil, 'ativo'>): Promise<Perfil>`, `atualizar(id, campos: { nome?: string; email?: string; papel?: Papel }): Promise<Perfil | null>`, `buscarAtivoParaReserva(id): Promise<Perfil | null>` (`... AND ativo FOR SHARE`), `definirAtivo(id, ativo: boolean): Promise<Perfil | null>`.
- Produces: `criarServicoUsuarios(deps)` → `{ listar(): Promise<Perfil[]>; criar(d: DadosCriarUsuario): Promise<Perfil>; editar(admin: Perfil, id: string, d: DadosEditarUsuario): Promise<Perfil> }` (`inativar`/`reativar` na Task 15).
- Rotas (todas admin): `GET /api/usuarios`, `POST /api/usuarios` (201), `PATCH /api/usuarios/:id`.

Fluxos (§6 Usuários): **criar** = `authAdmin.criarUsuario` → `transacao(r => r.perfis.inserir(...))`; se a transação falhar, `authAdmin.excluirUsuario(id)` e relança o erro original. **editar** = `transacao(r => { r.perfis.atualizar(...) → null: 404 "Usuário não encontrado."; se e-mail ou senha mudaram, authAdmin.atualizarUsuario(...) })`. Admin removendo o próprio papel de admin → 400 "Você não pode remover o seu próprio papel de administrador."

- [ ] **Step 1: Testes**

```ts
// unit
it('criar: falha ao inserir perfil exclui a conta do Auth', async () => {
  deps.authAdmin.criarUsuario.mockResolvedValue('id-novo');
  repos.perfis.inserir.mockRejectedValue(Object.assign(new Error(), { code: '23505', constraint_name: 'perfis_email_unico' }));
  await expect(servico.criar(dados)).rejects.toMatchObject({ code: '23505' });
  expect(deps.authAdmin.excluirUsuario).toHaveBeenCalledWith('id-novo');
});
it('editar: falha no Auth propaga o erro (rollback)', async () => { deps.authAdmin.atualizarUsuario.mockRejectedValue(new ErroApp(409, 'Já existe um usuário com este e-mail.')); await expect(servico.editar(admin, ID, { email: 'b@x.com' })).rejects.toMatchObject({ status: 409 }); });
it('editar: não chama o Auth se só o nome mudou', ...);
it('editar: admin não remove o próprio papel', async () => expect(servico.editar(admin, admin.id, { papel: 'usuario' })).rejects.toMatchObject({ status: 400, message: 'Você não pode remover o seu próprio papel de administrador.' }));
// integracao
it('admin cria professor e o professor consegue logar', ...);
it('e-mail já existente → 409', ...);
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar.** — `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: API de usuários"`.

---

### Task 9: Criar reserva (API)

**Files:**
- Create: `server/services/reservas.ts`, `server/services/notificacoes.ts`, `server/controllers/reservas.ts`, `server/routes/reservas.ts`
- Modify: `server/repositories/reservas.ts`, `server/repositories/historico.ts`, `server/routes/index.ts`
- Test: `tests/unit/servicoReservasCriar.test.ts`, `tests/integracao/reservasCriar.test.ts`

**Interfaces:**
- Produces (`RepoReservas`): `inserir(d: { salaId; usuarioId; inicio: Date; fim: Date; status: StatusReserva; finalidade: string }): Promise<Reserva>`, `buscarDetalhadas(ids: string[]): Promise<ReservaDetalhada[]>` (JOIN com salas e perfis).
- Produces (`RepoHistorico`): `registrar(entradas: { reservaId: string; anterior: StatusReserva | null; novo: StatusReserva; alteradoPor: string }[]): Promise<void>`.
- Produces (`server/services/notificacoes.ts`): `agruparPorSolicitante(reservas: ReservaDetalhada[], tipo: TipoEmail): EventoEmail[]` — um evento por `usuarioId`, `para = solicitanteEmail`.
- Produces: `criarServicoReservas(deps)` → `{ criar(usuario: Perfil, d: DadosCriarReserva): Promise<ReservaDTO> }` (cresce nas Tasks 10, 13 e 18).
- Rota: `POST /api/reservas` (logado) → 201 `ReservaDTO`.

Fluxo de `criar` (§6 Criar reserva), dentro de `deps.transacao`:
1. `validarJanelaReserva(inicio, fim, deps.agora())` → mensagem: 400.
2. `salas.buscarAtivaParaReserva(salaId)` → null: 400 "Sala inexistente ou inativa."
3. `perfis.buscarAtivoParaReserva(usuario.id)` → null: 403.
4. `reservas.inserir({ status: usuario.papel === 'admin' ? 'aprovada' : 'pendente', ... })`.
5. `historico.registrar([{ anterior: null, novo: status, alteradoPor: usuario.id }])`.
6. `buscarDetalhadas([id])` (ainda na transação).
Depois do commit: `await deps.notificar(agruparPorSolicitante(detalhadas, status === 'aprovada' ? 'confirmada' : 'criada'))`; retorna `paraReservaDTO`.

- [ ] **Step 1: Testes**

```ts
// unit
it('professor → pendente; admin → aprovada', ...);
it('grava histórico null → status inicial', async () => { await servico.criar(professor, dados); expect(repos.historico.registrar).toHaveBeenCalledWith([expect.objectContaining({ anterior: null, novo: 'pendente', alteradoPor: professor.id })]); });
it('domingo → 400 com a mensagem de horário', ...);
it('sala inativa → 400 "Sala inexistente ou inativa."', ...);
it('notifica "criada" para professor e "confirmada" para admin', ...);
it('notifica só depois do commit', async () => { /* transacao fake registra a ordem: notificar.mock.invocationCallOrder[0] > momento em que fn resolveu */ });
// integracao (depsIntegracao, supertest)
it('POST com data sem offset → 400 "Data e hora inválidas."', ...);                  // Review Focus 1
it('conflito → 409 "Esta sala já está reservada nesse horário."', ...);
it('duas criações simultâneas, dois clientes postgres → exatamente uma aceita', async () => {
  const [a, b] = [novoClienteSql(), novoClienteSql()];
  const servA = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(a) });
  const servB = criarServicoReservas({ ...depsIntegracao(), transacao: criarTransacao(b) });
  const r = await Promise.allSettled([servA.criar(prof1, dados), servB.criar(prof2, dados)]);
  expect(r.filter(x => x.status === 'fulfilled')).toHaveLength(1);
  expect(r.find(x => x.status === 'rejected')!.reason).toMatchObject({ code: '23P01' });
});
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar.** — `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: criação de reservas com bloqueio de conflito"`.

---

### Task 10: Listagem de reservas e pendentes (API)

**Files:**
- Modify: `server/repositories/reservas.ts`, `server/services/reservas.ts`, `server/controllers/reservas.ts`, `server/routes/reservas.ts`
- Test: `tests/unit/servicoReservasListar.test.ts`, `tests/integracao/reservasListar.test.ts`

**Interfaces:**
- Produces (`RepoReservas`): `listar(f: { inicio: Date; fim: Date; salaId?: string; tipo?: TipoSala; status: StatusFiltro[]; usuarioId?: string; agora: Date }): Promise<ReservaDetalhada[]>` — sobreposição `inicio < :fim AND fim > :inicio`; `pendente` = pendente com `inicio > agora`, `expirada` = pendente com `inicio <= agora`; ordem por início. `listarPendentesFuturas(agora: Date): Promise<ReservaDetalhada[]>`.
- Produces (serviço): `listar(usuario: Perfil, f: FiltroReservas): Promise<ReservaDTO[]>`, `listarPendentes(): Promise<ReservaDTO[]>`.
- Rotas: `GET /api/reservas` (logado), `GET /api/reservas/pendentes` (admin) — registre `/pendentes` **antes** de rotas com `/:id`.

Regras de status efetivo (§7):
- `minhas=true` (qualquer papel): `usuarioId = usuario.id`; status = filtro ou os cinco.
- Professor sem `minhas`: permitido `['pendente','expirada','aprovada']`; filtro com outro valor → 400 "Filtro de status não permitido."; sem filtro → os três.
- Admin sem `minhas`: filtro ou `['pendente','expirada','aprovada']`.

- [ ] **Step 1: Testes**

```ts
// unit
it('professor sem minhas pedindo recusada → 400', async () => expect(servico.listar(professor, { ...f, status: ['recusada'] })).rejects.toMatchObject({ status: 400, message: 'Filtro de status não permitido.' }));
it('professor sem filtro → pendente, expirada, aprovada', ...);
it('minhas=true → usuarioId do próprio e cinco status', ...);
it('admin sem filtro → pendente, expirada, aprovada', ...);
// integracao
it('professor não vê recusada/cancelada de outro no calendário', ...);
it('reserva das 9h–11h aparece numa janela 10h–12h (sobreposição)', ...);
it('/pendentes traz pendente daqui a 3 meses e não traz expirada', ...);
it('professor em /pendentes → 403', ...);
it('DTO não expõe solicitanteEmail', ...);
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar.** — `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: listagem de reservas e pendentes"`.

---

### Task 11: Telas de Salas e Usuários

**Files:**
- Create: `src/consultas/salas.ts`, `src/consultas/usuarios.ts`, `src/components/FormSala.tsx`, `src/components/FormUsuario.tsx`
- Modify: `src/pages/Salas.tsx`, `src/pages/Usuarios.tsx`
- Test: `src/components/FormSala.test.tsx`

**Interfaces:**
- Produces: `useSalas(incluirInativas?: boolean)`, `useCriarSala()`, `useEditarSala()`, `useUsuarios()`, `useCriarUsuario()`, `useEditarUsuario()` — mutations invalidam `['salas']` / `['usuarios']`.
- Formulários validam com os mesmos esquemas de `shared/esquemas.ts` e mostram erros da API (`ErroApi.message`) acima do botão.
- Salas: tabela (nome, tipo, capacidade, recursos como etiquetas, situação) + modal criar/editar; recursos digitados separados por vírgula. Usuários: tabela (nome, e-mail, papel, situação) + modal; na edição, campo "Nova senha (opcional)". Botões de inativar entram na Task 16.

- [ ] **Step 1: Teste** — `FormSala.test.tsx` (jsdom): enviar com nome "   " mostra a mensagem do esquema e não chama `onSalvar`; enviar válido chama `onSalvar` com `recursos: ['projetor', 'ar-condicionado']` a partir de "projetor, ar-condicionado".
- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` → PASS. Manual: `npm run dev`, cadastrar uma sala e um professor; repetir o nome da sala mostra "Já existe uma sala com este nome."
- [ ] **Step 5: Commit** — `git commit -m "feat: telas de salas e usuários"`.

---

### Task 12: Calendário e nova reserva

**Files:**
- Create: `src/consultas/reservas.ts`, `src/calendario/eventos.ts`, `src/calendario/ModalNovaReserva.tsx`
- Modify: `src/pages/Calendario.tsx`
- Test: `src/calendario/eventos.test.ts`, `src/calendario/ModalNovaReserva.test.tsx`

**Interfaces:**
- Produces: `buscarReservas(f: { inicio: string; fim: string; salaId?: string; tipo?: TipoSala; status?: StatusFiltro[]; minhas?: boolean }): Promise<ReservaDTO[]>`, `useCriarReserva()` (invalida `['reservas']` e `['pendentes']`).
- Produces: `reservaParaEvento(r: ReservaDTO): EventInput` — `title = "<salaNome> · <solicitanteNome>"`, cor: aprovada `#22c55e`, pendente `#facc15`, expirada `#9ca3af`; `extendedProps.reserva = r`.
- Produces: `<ModalNovaReserva aberto inicial={{ inicio?: Date; fim?: Date; salaId?: string }} salas={Sala[]} aoFechar />` — campos sala (oculto se `salaId` veio preenchido), data, início, fim, finalidade; envia ISO com offset (`date.toISOString()`); exibe `ErroApi.message` e permanece aberto em 409.

Calendário (§8): `@fullcalendar/react` com plugins dayGrid, timeGrid, list, interaction; `locale` pt-br; `timeZone: 'local'`; `slotMinTime '07:00'`, `slotMaxTime '23:00'`; `businessHours: { daysOfWeek: DIAS_FUNCIONAMENTO, startTime: HORA_ABERTURA, endTime: HORA_FECHAMENTO }`; `selectConstraint: 'businessHours'`; `selectable` nas visões de dia/semana; na visão de mês, `dateClick` → `changeView('timeGridDay', data)`; `initialView` `listWeek` quando `matchMedia('(max-width: 640px)')`, senão `timeGridWeek`; `events` como função que chama `buscarReservas` com `fetchInfo.startStr/endStr` e os filtros; filtro de **sala** acima do calendário (necessário ao RNF007); botão "Nova reserva" sempre visível. Os campos de horário do modal usam as constantes de `shared/`.

- [ ] **Step 1: Testes**

```ts
// eventos.test.ts
it('cores por status', () => {
  expect(reservaParaEvento({ ...r, status: 'aprovada', expirada: false }).backgroundColor).toBe('#22c55e');
  expect(reservaParaEvento({ ...r, status: 'pendente', expirada: false }).backgroundColor).toBe('#facc15');
  expect(reservaParaEvento({ ...r, status: 'pendente', expirada: true }).backgroundColor).toBe('#9ca3af');
});
// ModalNovaReserva.test.tsx (jsdom, QueryClientProvider, api mockada com Promise pendente)
it('duplo clique em Confirmar envia uma única requisição', async () => {   // Review Focus 5
  await user.dblClick(screen.getByRole('button', { name: 'Confirmar' }));
  expect(apiMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /Confirmar|Enviando/ })).toBeDisabled();
});
it('409 mantém o modal aberto com a mensagem', ...);
it('com salaId preenchido não mostra o seletor de sala', ...);
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` → PASS. Manual: com filtro de sala, arrastar um horário → finalidade → Confirmar (fluxo de §8); repetir no mesmo horário mostra o 409; em largura de celular (DevTools) abre em lista e "Nova reserva" funciona; domingo e 06:00 não são selecionáveis.
- [ ] **Step 5: Commit** — `git commit -m "feat: calendário e criação de reservas"`.

---

## Fase 3 — Importantes

### Task 13: Aprovar, recusar e cancelar (API)

**Files:**
- Modify: `server/repositories/reservas.ts`, `server/services/reservas.ts`, `server/controllers/reservas.ts`, `server/routes/reservas.ts`
- Test: `tests/unit/servicoReservasTransicoes.test.ts`, `tests/integracao/reservasTransicoes.test.ts`

**Interfaces:**
- Produces (`RepoReservas`): `buscarPorId(id): Promise<Reserva | null>`, `transicionar(p: { id: string; novo: StatusReserva; permitidos: StatusReserva[]; motivo?: string; exigirSalaAtiva: boolean }): Promise<Reserva | null>` — o UPDATE condicional de §6 (com `inicio > now()` e, se `exigirSalaAtiva`, o `EXISTS` da sala).
- Produces (serviço): `aprovar(usuario: Perfil, id: string)`, `recusar(usuario: Perfil, id: string, motivo: string)`, `cancelar(usuario: Perfil, id: string)` — todos `Promise<ReservaDTO>`.
- Rotas: `POST /api/reservas/:id/aprovar` (admin), `/recusar` (admin, corpo `esquemaRecusar`), `/cancelar` (logado). Todas validam `:id` com `esquemaUuid`; id inválido → 404 "Reserva não encontrada." (Review Focus 2).

Ordem (§6 Transições): `buscarPorId` → 404 "Reserva não encontrada." → permissão (cancelar: dono ou admin) → 403 → `transicionar` → null: 409 "Esta reserva não pode mais ser alterada." → `historico.registrar` → `buscarDetalhadas` — tudo na transação; depois `notificar(agruparPorSolicitante(..., 'aprovada' | 'recusada' | 'cancelada'))`.

| Ação | `permitidos` | `exigirSalaAtiva` |
|---|---|---|
| aprovar | `['pendente']` | true |
| recusar | `['pendente']` | false |
| cancelar | `['pendente', 'aprovada']` | false |

- [ ] **Step 1: Testes**

```ts
// unit
it('ordem 404 → 403 → 409', async () => {
  repos.reservas.buscarPorId.mockResolvedValue(null);
  await expect(servico.cancelar(professor, ID)).rejects.toMatchObject({ status: 404 });
  repos.reservas.buscarPorId.mockResolvedValue({ ...reserva, usuarioId: 'outro' });
  await expect(servico.cancelar(professor, ID)).rejects.toMatchObject({ status: 403 });
  repos.reservas.buscarPorId.mockResolvedValue({ ...reserva, usuarioId: professor.id });
  repos.reservas.transicionar.mockResolvedValue(null);
  await expect(servico.cancelar(professor, ID)).rejects.toMatchObject({ status: 409, message: 'Esta reserva não pode mais ser alterada.' });
});
it('aprovar passa permitidos [pendente] e exigirSalaAtiva true', ...);
it('recusar grava motivo e histórico pendente → recusada', ...);
it('notifica o tipo correto em cada ação', ...);
// integracao
it('aprovar e cancelar simultâneos (dois clientes) → exatamente um vence', ...);
it('professor cancela reserva alheia → 403', ...);
it('recusar reserva expirada → 409', ...);
it('POST /api/reservas/abc/cancelar → 404 "Reserva não encontrada."', ...);   // Review Focus 2
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar.** — `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: aprovar, recusar e cancelar reservas"`.

---

### Task 14: Notificações por e-mail

**Files:**
- Create: `server/lib/email.ts`
- Modify: `server/dependencias.ts` (troca `notificadorNulo` pelo real quando `GMAIL_USER` existir)
- Test: `tests/unit/email.test.ts`

**Interfaces:**
- Consumes: `EventoEmail`, `Notificador` (Task 4).
- Produces:
  ```ts
  function escaparHtml(texto: string): string;
  function montarEmail(e: EventoEmail, appUrl: string): { assunto: string; html: string; texto: string };
  function criarNotificador(cfg: { usuario: string; senha: string; appUrl: string; prazoMs?: number /* 5000 */;
    criarTransporte?: () => Pick<Transporter, 'sendMail' | 'close'> }): Notificador;
  ```
- Assuntos: criada "Solicitação de reserva recebida"; confirmada "Reserva confirmada"; aprovada "Reserva aprovada"; recusada "Reserva recusada"; cancelada "Reserva cancelada". Corpo: saudação com o nome, uma linha por reserva (sala, data `dd/MM/yyyy`, `HH:mm–HH:mm` no fuso, finalidade), motivo da recusa quando houver, link `appUrl`.
- `criarNotificador`: se `eventos` vazio, retorna; cria o transporte **por chamada** (`nodemailer.createTransport({ service: 'gmail', pool: true, maxConnections: 2, auth })`), envia com `Promise.allSettled`, tudo dentro de `Promise.race` com timer de `prazoMs`; no `finally`, `close()`; erros e estouro de prazo só geram `console.error`; `from = cfg.usuario`.

- [ ] **Step 1: Testes**

```ts
it('escapa HTML da finalidade e do motivo', () => {
  const { html } = montarEmail({ ...evento, tipo: 'recusada', reservas: [{ ...r, finalidade: '<script>x</script>', motivoRecusa: 'a & b' }] }, URL);
  expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('a &amp; b');
});
it('horário em Brasília', () => expect(montarEmail(eventoComInicio('2026-11-04T01:00:00Z'), URL).texto).toContain('03/11/2026'));
it('assunto por tipo', ...);
it('um sendMail por evento e fecha o transporte', async () => { await notificar([e1, e2]); expect(send).toHaveBeenCalledTimes(2); expect(close).toHaveBeenCalledOnce(); });
it('não rejeita quando o envio falha', async () => { send.mockRejectedValue(new Error('smtp')); await expect(notificar([e1])).resolves.toBeUndefined(); });
it('respeita o prazo', async () => { vi.useFakeTimers(); send.mockReturnValue(new Promise(() => {})); const p = notificar([e1]); await vi.advanceTimersByTimeAsync(5000); await expect(p).resolves.toBeUndefined(); expect(close).toHaveBeenCalled(); });
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` → PASS. Manual: com `GMAIL_USER`/`GMAIL_APP_PASSWORD` no `.env`, criar uma reserva como professor (com seu próprio e-mail) e receber "Solicitação de reserva recebida".
- [ ] **Step 5: Commit** — `git commit -m "feat: notificações por e-mail"`.

---

### Task 15: Inativar e reativar salas e usuários (API)

**Files:**
- Modify: `server/repositories/reservas.ts`, `server/services/salas.ts`, `server/services/usuarios.ts`, controllers e rotas de salas e usuários
- Test: `tests/unit/inativacao.test.ts`, `tests/integracao/inativacao.test.ts`

**Interfaces:**
- Produces (`RepoReservas`): `cancelarFuturasDaSala(salaId: string): Promise<{ id: string; anterior: StatusReserva }[]>` e `cancelarFuturasDoUsuario(usuarioId: string): Promise<{ id: string; anterior: StatusReserva }[]>` — primeiro `SELECT id, status ... WHERE <filtro> AND status IN ('pendente','aprovada') AND inicio > now() FOR UPDATE`, depois `UPDATE reservas SET status = 'cancelada', atualizado_em = now() WHERE id = ANY(<ids>)`; o status anterior alimenta o histórico.
- Produces (serviços): salas `inativar(admin: Perfil, id)`, `reativar(id)` → `Promise<Sala>`; usuários `inativar(admin: Perfil, id)`, `reativar(id)` → `Promise<Perfil>`.
- Rotas (admin): `POST /api/salas/:id/inativar|reativar`, `POST /api/usuarios/:id/inativar|reativar`.

Ordem obrigatória (§6), numa transação:
- Sala: `salas.definirAtiva(id, false)` (null → 404 "Sala não encontrada.") → `reservas.cancelarFuturasDaSala` → `historico.registrar` (`alteradoPor = admin.id`) → `buscarDetalhadas`; commit; `notificar(agruparPorSolicitante(..., 'cancelada'))`.
- Usuário: `admin.id === id` → 400 "Você não pode inativar a sua própria conta." → `perfis.definirAtivo(id, false)` (null → 404 "Usuário não encontrado.") → `cancelarFuturasDoUsuario` → histórico → `buscarDetalhadas` → `authAdmin.definirBloqueio(id, true)`; commit; notificar.
- Reativar usuário: `perfis.definirAtivo(id, true)` → `authAdmin.definirBloqueio(id, false)` na transação. Reativar sala não restaura reservas.

- [ ] **Step 1: Testes**

```ts
// unit
it('inativar sala: ordem definirAtiva → cancelar → histórico', async () => {
  await servicoSalas.inativar(admin, ID);
  const ordem = [repos.salas.definirAtiva, repos.reservas.cancelarFuturasDaSala, repos.historico.registrar].map(f => f.mock.invocationCallOrder[0]);
  expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
});
it('um e-mail por solicitante com todas as reservas dele', ...);  // 3 reservas de 2 professores → notificar com 2 eventos
it('admin não inativa a si mesmo', ...);
it('falha no ban do Auth propaga (rollback)', ...);
// integracao
it('inativar sala cancela só futuras pendentes/aprovadas e grava histórico com o admin', ...);
it('inativar usuário: login seguinte é recusado e /api/me → 403', ...);
it('reativar usuário volta a permitir login', ...);
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar.** — `npm test` e `npm run test:integracao` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: inativação de salas e usuários com cancelamento automático"`.

---

### Task 16: Detalhes, Aprovações, "Minhas reservas" e botões de inativar (front)

**Files:**
- Create: `src/calendario/ModalDetalhes.tsx`, `src/components/ListaReservas.tsx`, `src/components/SeletorPeriodo.tsx`
- Modify: `src/consultas/reservas.ts`, `src/consultas/salas.ts`, `src/consultas/usuarios.ts`, `src/pages/Calendario.tsx`, `src/pages/Aprovacoes.tsx`, `src/pages/Reservas.tsx`, `src/pages/Salas.tsx`, `src/pages/Usuarios.tsx`
- Test: `src/calendario/ModalDetalhes.test.tsx`

**Interfaces:**
- Produces: `useAprovar()`, `useRecusar()`, `useCancelar()`, `usePendentes()`, `useInativarSala()`, `useReativarSala()`, `useInativarUsuario()`, `useReativarUsuario()` — invalidam `['reservas']`, `['pendentes']` e a lista afetada.
- Produces: `<ModalDetalhes reserva={ReservaDTO} perfil={Perfil} aoFechar />` — mostra sala, data/horário, solicitante, finalidade, status ("Expirada" quando `expirada`), motivo de recusa; "Cancelar reserva" se (dono ou admin) e status `pendente`/`aprovada` e não expirada; "Aprovar"/"Recusar" se admin e `pendente` e não expirada; recusar pede motivo obrigatório. Sem histórico nesta fase.
- Produces: `<SeletorPeriodo valor={{ inicio: Date; fim: Date }} aoMudar />` — começa no mês corrente, botões mês anterior/próximo.
- `/reservas`: `ListaReservas` com `minhas=true` e o período do seletor. `/aprovacoes`: `usePendentes()` com aprovar/recusar. Salas e Usuários: botões Inativar (com `confirm("As reservas futuras serão canceladas e os solicitantes avisados por e-mail. Continuar?")`) e Reativar.

- [ ] **Step 1: Testes** (`ModalDetalhes.test.tsx`)

```tsx
it('professor vendo reserva alheia não tem botões de ação', ...);
it('dono vê Cancelar; admin vê Aprovar e Recusar em pendente', ...);
it('expirada mostra "Expirada" e nenhum botão de aprovar', ...);
it('Recusar sem motivo não envia', ...);
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` → PASS. Manual: professor cria → admin aprova em Aprovações → professor vê "Aprovada" em Minhas reservas e cancela; inativar uma sala com reservas futuras remove-as do calendário.
- [ ] **Step 5: Commit** — `git commit -m "feat: detalhes, aprovações e minhas reservas"`.

---

### Task 17: Sessão — inatividade e logout forçado

**Files:**
- Create: `src/auth/inatividade.ts`, `src/auth/useInatividade.ts`
- Modify: `src/auth/AuthProvider.tsx`, `src/pages/Login.tsx`
- Test: `src/auth/inatividade.test.ts`

**Interfaces:**
- Produces (`inatividade.ts`, funções puras sobre um `Storage`):
  ```ts
  const CHAVE_ATIVIDADE = 'agendamento:ultimaAtividade';
  const LIMITE_INATIVIDADE_MS = 30 * 60 * 1000;
  function registrarAtividade(storage: Storage, agora: number): void;
  function sessaoExpirada(storage: Storage, agora: number): boolean; // sem chave → false
  ```
- Produces: `useInatividade(aoExpirar: () => void)` — escuta `mousemove`, `keydown`, `touchstart`, `click` com throttle de 15 s; verifica ao montar e a cada 60 s.
- `AuthProvider`: grava `registrarAtividade` no login bem-sucedido; ao expirar → `supabase.auth.signOut({ scope: 'local' })` e navega para `/login?expirada=1`; `/api/me` com 401/403 → mesmo logout local. `Login` mostra "Sessão expirada. Entre novamente." quando `expirada=1`. Acessos a `localStorage` dentro de `try/catch`.

- [ ] **Step 1: Testes**

```ts
it('expira após 30 minutos', () => { registrarAtividade(s, 0); expect(sessaoExpirada(s, 30 * 60 * 1000 - 1)).toBe(false); expect(sessaoExpirada(s, 30 * 60 * 1000 + 1)).toBe(true); });
it('sem registro não expira', () => expect(sessaoExpirada(s, Date.now())).toBe(false));
it('atividade em outra aba (mesmo storage) renova', () => { registrarAtividade(s, 0); registrarAtividade(s, 20 * 60 * 1000); expect(sessaoExpirada(s, 40 * 60 * 1000)).toBe(false); });
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` → PASS. Manual: alterar a chave no DevTools para um valor de 31 min atrás e recarregar → volta ao login com "Sessão expirada. Entre novamente."
- [ ] **Step 5: Commit** — `git commit -m "feat: encerramento de sessão por inatividade"`.

---

## Fase 4 — Desejáveis

### Task 18: Histórico de mudanças e filtros avançados

**Files:**
- Modify: `server/repositories/historico.ts`, `server/services/reservas.ts`, `server/controllers/reservas.ts`, `server/routes/reservas.ts`, `src/consultas/reservas.ts`, `src/calendario/ModalDetalhes.tsx`, `src/components/ListaReservas.tsx`, `src/pages/Calendario.tsx`, `src/pages/Reservas.tsx`
- Test: `tests/unit/servicoHistorico.test.ts`, `tests/integracao/historico.test.ts`

**Interfaces:**
- Produces (`RepoHistorico`): `listarDaReserva(reservaId): Promise<EntradaHistoricoDTO[]>` (JOIN com `perfis` para `alteradoPorNome`, ordem cronológica).
- Produces (serviço): `historico(usuario: Perfil, id: string): Promise<EntradaHistoricoDTO[]>` — 404 → 403 (dono ou admin) como nas transições.
- Rota: `GET /api/reservas/:id/historico`.
- Front: `ModalDetalhes` e `ListaReservas` mostram o histórico **apenas** para dono ou admin (não chamam a rota nos outros casos). Calendário ganha filtros de tipo e status (só pendente, aprovada, expirada). `/reservas`: admin vê todas, abrindo com `status=pendente,expirada,aprovada,recusada,cancelada`, com filtros de sala e status; professor continua com `minhas=true`.

- [ ] **Step 1: Testes** — unit: 404/403/ok; integração: criar → aprovar → cancelar produz 3 entradas com os nomes de quem alterou; professor pedindo histórico alheio → 403.
- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` e `npm run test:integracao` → PASS. Manual: professor abrindo reserva alheia no calendário não vê histórico nem erro.
- [ ] **Step 5: Commit** — `git commit -m "feat: histórico de mudanças e filtros avançados"`.

---

### Task 19: Relatório mensal em PDF

**Files:**
- Create: `server/lib/datas.ts`, `server/services/relatorios.ts`, `server/controllers/relatorios.ts`, `server/routes/relatorios.ts`, `src/consultas/relatorios.ts`, `src/relatorios/gerarPdf.ts`
- Modify: `server/repositories/reservas.ts`, `server/routes/index.ts`, `src/pages/Relatorios.tsx`
- Test: `tests/unit/datas.test.ts`, `tests/unit/servicoRelatorios.test.ts`, `src/relatorios/gerarPdf.test.ts`

**Interfaces:**
- Produces: `limitesDoMes(mes: string): { inicio: Date; fim: Date }` (meia-noite em Brasília do dia 1 até o dia 1 do mês seguinte).
- Produces (`RepoReservas`): `listarPeriodo(inicio: Date, fim: Date): Promise<ReservaDetalhada[]>` (reservas com `inicio` no período, todos os status).
- Produces: `criarServicoRelatorios(deps).mensal(mes: string): Promise<RelatorioMensalDTO>` — totais por `StatusFiltro` (pendente vencida conta como `expirada`).
- Rota: `GET /api/relatorios/mensal?mes=AAAA-MM` (admin; `esquemaMes`).
- Produces: `gerarPdfMensal(dados: RelatorioMensalDTO): jsPDF` — título "Relatório de reservas — MM/AAAA", linha de totais, tabela (`jspdf-autotable`) com Data, Horário, Sala, Solicitante, Finalidade, Situação. Página `/relatorios`: seletor de mês + botão "Baixar PDF" (`doc.save('reservas-AAAA-MM.pdf')`).

- [ ] **Step 1: Testes**

```ts
it('novembro/2026', () => expect(limitesDoMes('2026-11')).toEqual({ inicio: new Date('2026-11-01T03:00:00Z'), fim: new Date('2026-12-01T03:00:00Z') }));
it('dezembro vira janeiro do ano seguinte', () => expect(limitesDoMes('2026-12').fim).toEqual(new Date('2027-01-01T03:00:00Z')));
it('totais contam pendente vencida como expirada', ...);
it('mes inválido → 400 "Mês inválido."', ...);
it('gerarPdfMensal produz documento com 1+ páginas sem lançar', () => expect(gerarPdfMensal(dados).getNumberOfPages()).toBeGreaterThan(0));
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` → PASS. Manual: baixar o PDF do mês corrente; acentos aparecem corretamente.
- [ ] **Step 5: Commit** — `git commit -m "feat: relatório mensal em PDF"`.

---

### Task 20: Publicação, roteiro de testes e medição de desempenho

**Files:**
- Create: `docs/roteiro-de-testes.md`, `README.md`

- [ ] **Step 1: Publicar (manual, com você)** — subir o repositório no GitHub; no Netlify, "Import from Git", build `npm run build`, publish `dist`; cadastrar as variáveis de §9 (produção) em Site settings → Environment variables; `APP_URL` = URL do site.
- [ ] **Step 2: Escrever `docs/roteiro-de-testes.md`** com os passos de §10 item 3 (incluindo o envio de e-mail após ~10 min com a função ociosa) e uma tabela de resultados (passo, esperado, obtido, data).
- [ ] **Step 3: Executar o roteiro no site publicado** e preencher a tabela.
- [ ] **Step 4: Medir o RNF001** — no DevTools (aba Network), 5 criações de reserva com cold start (primeira após ~15 min parado) e 5 "quentes"; registrar os tempos no roteiro. Se a mediana "quente" passar de 2 s, remover o e-mail do tipo `criada` (manter `confirmada` e os demais) conforme §6 e registrar a decisão.
- [ ] **Step 5: README** — o que é o sistema, a arquitetura em camadas (com o diagrama de §4), como rodar localmente (`npm run dev`), como rodar os testes, onde está cada regra (aponta para `server/services/` e para a constraint na migração).
- [ ] **Step 6: Verificação final** — `npm run typecheck`, `npm test`, `npm run test:integracao` → tudo PASS.
- [ ] **Step 7: Commit** — `git add docs README.md && git commit -m "docs: roteiro de testes, medições e README"`.
