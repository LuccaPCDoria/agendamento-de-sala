# Identidade Visual — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a nova identidade visual (Menta & coral, Unbounded/Manrope/Space Mono, logo "calendário confirmado", login em painel dividido) com modo escuro automático + botão, sem mudar comportamento.

**Architecture:** Cores como variáveis CSS em `src/tema/tokens.css` (claro em `:root`, escuro em `.dark`) expostas no Tailwind; uma store de tema (`src/tema/tema.ts`) com `useSyncExternalStore`; componentes base em `src/ui/` reutilizados por todas as telas; FullCalendar recolorido por variáveis `--fc-*` e classes de evento.

**Tech Stack:** React 18, Vite, Tailwind 3.4, TanStack Query 5, FullCalendar 6.1, Vitest + Testing Library, `lucide-react`, `@fontsource/unbounded`, `@fontsource/manrope`, `@fontsource/space-mono`.

**Spec:** `docs/superpowers/specs/2026-10-29-identidade-visual-design.md` — leia inteira antes da primeira tarefa; as tarefas citam suas seções (§N) em vez de repetir valores. **Todos os hex, nomes de tokens, pesos de fonte, ícones e textos vêm da spec, literalmente.**

## Global Constraints

- **Somente visual:** nenhuma regra de negócio, rota da API, chamada nova à API (o professor nunca chama `/reservas/pendentes`), texto de regra ou comportamento muda. Textos de carregamento existentes preservados exatamente ("Enviando...", "Entrando...", "Salvando...").
- Cores só por tokens (`bg-superficie`, `text-suave`, `border-borda-campo`…); nenhuma classe de cor do Tailwind padrão (`slate-*`, `blue-*`, `amber-*`, `white` etc.; exceção: `bg-black/40`/`bg-black/60` dos overlays) e nenhum hex fora de `src/tema/tokens.css`, `tailwind.config.js` (sombras), do SVG do `Logo` (variante branca, §5), de `public/favicon.svg` e do gradiente do login (§6.2). Branco em telas = token `primaria-botao-texto` (`#FFFFFF` no claro).
- Bordas sem cor explícita (`border`, `border-b`, `divide-y`) usam a borda padrão configurada na Task 1 (token `borda`).
- `Botao` tem `type="button"` por padrão: botões de envio de formulário **sempre** passam `type="submit"` explicitamente.
- `primaria` nunca como cor de texto (§3.2); anel de foco padrão em todo elemento interativo: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie`.
- Fontes: `font-titulo` (Unbounded) só em textos curtos (§3.4); `font-numero` (Space Mono) em horários/datas numéricas; `font-texto` (Manrope) no resto.
- Breakpoints: menu/login mudam em `md` (768 px); regras existentes de 640 px do calendário e tabelas permanecem.
- Imports relativos; textos em pt-BR.
- Testes de front ao lado do arquivo com `// @vitest-environment jsdom` na 1ª linha; `window.matchMedia` sempre acessado com `?.` (jsdom não o tem).
- Depois de `npm run build`, rodar `rm -f dist/_redirects` (o `predev` faz isso, mas o servidor local pode estar rodando).
- Nunca ler/imprimir/commitar `.env*`; nunca commitar `.superpowers/` nem `dist/`.
- Toda mensagem de commit termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Os comandos de commit das tarefas são abreviados: sempre `git add <arquivos da tarefa> && git commit -m "<mensagem>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- Testes que leem arquivos do repositório usam caminho relativo ao teste: `fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8')` (idem `../../src/tema/tokens.css`).
- Nomes acessíveis atuais são preservados (`aria-label="Fechar"` do modal, "Abrir menu", "Mês anterior"/"Próximo mês", rótulos "Filtrar por sala"/"Filtrar por tipo", rótulos de campos) — testes existentes dependem deles.

## Review Focus

1. **Controles nativos no escuro** (input `date`/`time`/`month`, lista de opções do `<select>` no Chrome/Windows, checkboxes) legíveis — exige `color-scheme` (§3.1). Teste na Task 1 (o CSS contém `color-scheme: dark` dentro de `.dark`) e verificação manual na Task 9.
2. **Nomes/finalidades longos** (ex.: 200 caracteres) em eventos do calendário e linhas de reserva não podem estourar a largura a 390 px — `truncate`/`line-clamp` + `min-w-0`. Teste na Task 7 (linha com finalidade de 200 caracteres tem classe de truncamento) e verificação na Task 9.
3. **Foco pelo teclado visível** em todos os elementos interativos nos dois temas (incluindo botões do FullCalendar e eventos). Teste na Task 3 (`Botao` tem as classes de anel) e verificação manual (Tab) na Task 9.
4. **Trocar o tema com o menu móvel ou um modal aberto** não dessincroniza ícones nem fecha nada; Esc no menu móvel não afeta modal fechado. Teste na Task 2 (dois `BotaoTema` sincronizados) e Task 4 (Esc fecha o menu).
5. **`localStorage` bloqueado** (navegação anônima) → tema funciona pela preferência do sistema, sem erro. Teste na Task 2 (setItem/getItem lançando).

---

## Estrutura de arquivos

```
src/tema/tokens.css        tokens de cor (§3.1–3.2), color-scheme, accent-color
src/tema/tema.ts           CHAVE_TEMA, resolverTema, store (iniciarTema/obterTema/assinar/alternar)
src/tema/useTema.ts        hook useSyncExternalStore
src/ui/Botao.tsx  Cartao.tsx  Campo.tsx  Selecao.tsx  SeloStatus.tsx  Logo.tsx
src/ui/Titulo.tsx  Hora.tsx  EstadoVazio.tsx  BotaoTema.tsx
src/components/ContadorPendentes.tsx
public/favicon.svg
tests/unit/contraste.test.ts
tests/unit/indexHtml.test.ts
```
Modificados: `tailwind.config.js`, `index.html`, `src/main.tsx`, `src/index.css`, `src/components/{Layout,Modal,ListaReservas,SeletorPeriodo,FormSala,FormUsuario}.tsx`, `src/pages/*.tsx`, `src/calendario/{eventos.ts,ModalDetalhes.tsx,ModalNovaReserva.tsx}`, testes afetados.

---

### Task 1: Tokens, Tailwind, fontes e teste de contraste

**Files:**
- Create: `src/tema/tokens.css`, `tests/unit/contraste.test.ts`
- Modify: `tailwind.config.js`, `src/main.tsx`, `src/index.css`, `package.json` (deps)

**Interfaces:**
- Produces: classes Tailwind de cor para **todos** os tokens da §3.2 (`bg-<token>`, `text-<token>`, `border-<token>`, `ring-<token>`, com opacidade `/<n>`); `font-titulo`, `font-texto`, `font-numero`; `darkMode: 'class'`; `shadow-cartao`, `shadow-modal`; borda padrão (`border` sem cor) = token `borda`.
- Produces: `tokens.css` no formato exato da §3.1 (dois blocos, uma declaração `--cor-<nome>: R G B;` por linha).

- [ ] **Step 1: Instalar dependências** — `npm i lucide-react @fontsource/unbounded @fontsource/manrope @fontsource/space-mono`.
- [ ] **Step 2: Escrever o teste de contraste**

```ts
// tests/unit/contraste.test.ts — lê src/tema/tokens.css com fs
function blocos(css: string): { claro: Record<string, [number, number, number]>; escuro: Record<string, [number, number, number]> } // parse de ':root {' e '.dark {'
function contraste(a: RGB, b: RGB): number // WCAG 2.x: (L1+0.05)/(L2+0.05), L com linearização sRGB
it('os dois temas têm o mesmo conjunto de tokens', () => expect(Object.keys(escuro).sort()).toEqual(Object.keys(claro).sort()));
it('contém todos os tokens da spec', () => expect(Object.keys(claro)).toEqual(expect.arrayContaining(['fundo','superficie','superficie-2','borda','borda-campo','texto','suave','primaria','primaria-forte','primaria-suave','primaria-botao','primaria-botao-texto','coral','coral-texto','coral-suave','coral-forte','erro','erro-texto','erro-suave','erro-forte','neutro-suave','neutro-forte','evento-aprovada','evento-aprovada-texto','evento-expirada'])));
const PARES: [string, string, number][] = [
  ['texto','fundo',4.5], ['texto','superficie',4.5], ['texto','superficie-2',4.5], ['texto','primaria-suave',4.5],
  ['suave','fundo',4.5], ['suave','superficie',4.5], ['suave','superficie-2',4.5], ['suave','primaria-suave',4.5],
  ['primaria-forte','superficie',4.5], ['primaria-forte','primaria-suave',4.5], ['primaria-forte','superficie-2',4.5], ['erro-forte','superficie-2',4.5],
  ['primaria-botao-texto','primaria-botao',4.5], ['coral-texto','coral',4.5], ['coral-forte','coral-suave',4.5], ['coral-forte','superficie',4.5],
  ['erro','superficie',4.5], ['erro','fundo',4.5], ['erro-texto','erro',4.5], ['erro-forte','erro-suave',4.5], ['erro-forte','superficie',4.5],
  ['neutro-forte','neutro-suave',4.5], ['neutro-forte','superficie',4.5], ['evento-aprovada-texto','evento-aprovada',4.5], ['texto','evento-expirada',4.5],
  ['borda-campo','superficie',3], ['borda-campo','superficie-2',3], ['primaria','superficie',3], ['primaria','fundo',3],
  ['neutro-forte','evento-expirada',3], ['coral-forte','superficie',3], ['evento-aprovada','superficie',3],
];
it('o bloco .dark vem depois do :root (mesma especificidade)', () => expect(css.indexOf('.dark {')).toBeGreaterThan(css.indexOf(':root {')));
describe.each(['claro', 'escuro'])('tema %s', (t) => {
  it.each(PARES)('%s sobre %s ≥ %s', (frente, fundo, min) => expect(contraste(T[t][frente], T[t][fundo])).toBeGreaterThanOrEqual(min));
});
it('declara color-scheme nos dois blocos', () => { expect(css).toMatch(/:root\s*{[^}]*color-scheme:\s*light/); expect(css).toMatch(/\.dark\s*{[^}]*color-scheme:\s*dark/); }); // Review Focus 1
```

- [ ] **Step 3: Rodar e ver falhar** — `npm test` → FAIL (arquivo inexistente).
- [ ] **Step 4: Implementar** `tokens.css` com os valores da §3.2 (hex → trio decimal), `color-scheme` e `accent-color` (§3.1); `tailwind.config.js` com `darkMode: 'class'`, e **em `theme.extend`** (nunca em `theme` direto, para manter `black`/`transparent`/`current`): `colors` com `rgb(var(--cor-x) / <alpha-value>)` para cada token, `borderColor: { DEFAULT: 'rgb(var(--cor-borda) / <alpha-value>)' }`, `boxShadow: { cartao: '0 4px 14px rgba(15,159,143,.08)', modal: '0 20px 50px rgba(16,48,44,.18)' }` e `fontFamily` da §3.4; em `src/main.tsx` importar `./tema/tokens.css` antes de `./index.css` e os pesos da §3.4 (`@fontsource/unbounded/600.css`, `/800.css`; `@fontsource/manrope/400.css`, `/500.css`, `/700.css`; `@fontsource/space-mono/400.css`, `/700.css`); em `src/index.css`, `body { @apply bg-fundo text-texto font-texto antialiased; }`. Se algum par falhar, ajustar o token mantendo o tom e registrar no relatório (spec §8).
- [ ] **Step 5: Rodar** — `npm test`, `npm run typecheck`, `npm run build` (depois `rm -f dist/_redirects`) → PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(visual): tokens de cor, fontes e teste de contraste"`.

---

### Task 2: Tema claro/escuro e botão de tema

**Files:**
- Create: `src/tema/tema.ts`, `src/tema/useTema.ts`, `src/ui/BotaoTema.tsx`, `tests/unit/indexHtml.test.ts`, `src/tema/tema.test.ts`, `src/ui/BotaoTema.test.tsx`
- Modify: `index.html`, `src/main.tsx`

**Interfaces:**
- Produces (`tema.ts`):
  ```ts
  export type Tema = 'claro' | 'escuro';
  export const CHAVE_TEMA = 'agendamento:tema';
  export function resolverTema(salvo: string | null, prefereEscuro: boolean): Tema;
  export function iniciarTema(): void;            // lê preferência, aplica classe, registra listener do sistema (idempotente)
  export function obterTema(): Tema;               // antes de iniciarTema(): lê classList.contains('dark')
  export function assinar(cb: () => void): () => void;
  export function alternar(): void;                // grava escolha explícita e aplica; se localStorage lançar, troca em memória e passa a ignorar o sistema até recarregar
  ```
- **Isolamento nos testes:** a store guarda estado no módulo; cada teste faz `vi.resetModules()` + `const m = await import('./tema')`, limpa `document.documentElement.className` e `localStorage`, e instala o mock de `matchMedia` desejado antes do import.
- Produces: `useTema(): { tema: Tema; alternar: () => void }`; `<BotaoTema className?: string />` com ícone `Moon` (tema claro) / `Sun` (tema escuro) e `aria-label` "Ativar modo escuro" / "Ativar modo claro".

- [ ] **Step 1: Testes**

```ts
// tema.test.ts (jsdom) — mock de window.matchMedia com addEventListener e um controle para disparar 'change'
it('salvo vence o sistema', () => { expect(resolverTema('claro', true)).toBe('claro'); expect(resolverTema('escuro', false)).toBe('escuro'); });
it('sem salvo segue o sistema', () => { expect(resolverTema(null, true)).toBe('escuro'); expect(resolverTema('lixo', false)).toBe('claro'); });
it('iniciarTema aplica a classe dark quando o sistema é escuro', ...);
it('alternar troca, persiste em agendamento:tema e notifica assinantes', ...);
it('sem preferência salva acompanha a mudança do sistema', ...);
it('com preferência salva ignora a mudança do sistema', ...);
it('localStorage lançando erro: tema segue o sistema e alternar não quebra', ...); // Review Focus 5
it('sem matchMedia (undefined) assume claro', ...);
// BotaoTema.test.tsx
it('aria-label conforme o tema e clique alterna', ...);
it('dois BotaoTema montados ficam sincronizados', ...);                          // Review Focus 4
// tests/unit/indexHtml.test.ts
it('script pré-pintura usa a mesma chave e o mesmo media query', () => { const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8'); expect(html).toContain("agendamento:tema"); expect(html).toContain('(prefers-color-scheme: dark)'); });
```

- [ ] **Step 2: Rodar e ver falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.** Script inline no `<head>` do `index.html`, antes de qualquer outro script, numa IIFE (sem globais) com try/catch: `(function(){ var t; try { t = localStorage.getItem('agendamento:tema'); } catch (x) {} var escuro = t === 'escuro' || (t !== 'claro' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); if (escuro) document.documentElement.classList.add('dark'); })();`. Trocar o favicon depois na Task 3. `iniciarTema()` chamado em `src/main.tsx` antes do `render`.
- [ ] **Step 4: Rodar** — `npm test`, `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(visual): modo escuro automático com botão"`.

---

### Task 3: Componentes base e logo

**Files:**
- Create: `src/ui/{Botao,Cartao,Campo,Selecao,SeloStatus,Logo,Titulo,Hora,EstadoVazio}.tsx`, `public/favicon.svg`, `src/ui/Botao.test.tsx`, `src/ui/SeloStatus.test.tsx`
- Modify: `index.html` (`<link rel="icon" type="image/svg+xml" href="/favicon.svg">`)

**Interfaces (Produces):**
```ts
Botao(props: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'principal'|'secundario'|'perigo'|'discreto'; carregando?: boolean; textoCarregando?: string; icone?: ReactNode })
Cartao(props: HTMLAttributes<HTMLDivElement> & { as?: 'div'|'section'|'li' })
Campo(props: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; rotuloOculto?: boolean; erro?: string | null })   // id via useId, <label htmlFor> (sr-only se rotuloOculto)
Selecao(props: SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string; rotuloOculto?: boolean; erro?: string | null; children: ReactNode })
SeloStatus(props: { status: StatusReserva; expirada?: boolean })
Logo(props: { tamanho?: number; comNome?: boolean; variante?: 'padrao'|'branca'; className?: string })   // comNome: SVG aria-hidden; sem nome: role="img" aria-label="Agendamento de Salas"
Titulo(props: { children: ReactNode; subtitulo?: string; acao?: ReactNode })   // h1 font-titulo 800 + p text-suave; acao alinhada à direita
Hora(props: { children: ReactNode; className?: string })                       // span font-numero
export const classesCampo: string                                              // classes visuais do Campo, reutilizadas no textarea do motivo de recusa
EstadoVazio(props: { icone: LucideIcon; mensagem: string })
```
Estilos conforme §3.2–3.5 e §5. `Botao` padrão `type="button"`; `disabled` efetivo = `disabled || carregando`; quando `carregando`, mostra `textoCarregando ?? children`. Variantes nos selos/cartões usam `shadow-cartao`/`dark:shadow-none`.

- [ ] **Step 1: Testes**

```tsx
it('Botao principal tem as classes de token e de anel de foco', () => { const b = render(<Botao>Ok</Botao>).getByRole('button'); expect(b.className).toMatch(/bg-primaria-botao/); expect(b.className).toMatch(/focus-visible:ring-primaria/); }); // Review Focus 3
it('Botao carregando fica desabilitado e mostra textoCarregando', ...);
it.each([['aprovada', false, 'Aprovada', /bg-primaria-suave/], ['pendente', false, 'Pendente', /bg-coral-suave/], ['recusada', false, 'Recusada', /bg-erro-suave/], ['cancelada', false, 'Cancelada', /bg-neutro-suave/], ['pendente', true, 'Expirada', /border-dashed/]])
  ('SeloStatus %s (expirada=%s) mostra %s', (status, expirada, texto, classe) => { ... });
it('Campo liga rótulo ao input e mostra erro com role=alert', ...);
it('Selecao com rotuloOculto continua acessível por getByLabelText e o rótulo tem sr-only', ...);
it('Botao com disabled={true} e carregando={false} fica desabilitado', ...);
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar** os componentes e o `favicon.svg` (variante padrão em cores fixas do tema claro).
- [ ] **Step 4: Passar** — `npm test`, `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(visual): componentes base e logo"`.

---

### Task 4: Layout, menu, contador de pendentes e Modal

**Files:**
- Create: `src/components/ContadorPendentes.tsx`, `src/components/ContadorPendentes.test.tsx`, `src/components/Layout.test.tsx`
- Modify: `src/components/Layout.tsx`, `src/components/menu.ts` (adicionar `icone` a cada item), `src/components/menu.test.ts`, `src/components/Modal.tsx`, `src/components/RotaProtegida.tsx` (cores)

**Interfaces:**
- Consumes: `usePendentes()` (`src/consultas/reservas.ts`), `useAuth()`, `Logo`, `BotaoTema`, `Botao`.
- Produces: `itensDoMenu(papel)` agora retorna `{ rota; rotulo; icone: LucideIcon }[]` (ícones da §6.1); `<ContadorPendentes />` (sem props; só é renderizado pelo `Layout` quando `perfil.papel === 'admin'`).

Layout conforme §6.1 (desktop ≥ `md`: menu lateral; celular: cabeçalho + painel sobreposto com backdrop, fecha no backdrop, item ou Esc). **Uma única `<nav aria-label="Menu principal">`** (o mesmo `aside` vira lateral fixa em `md` e painel sobreposto abaixo disso); o botão do cabeçalho alterna `aria-label` "Abrir menu"/"Fechar menu" e `aria-expanded`; backdrop com `data-testid="backdrop-menu"`. O `BotaoTema` aparece no cabeçalho móvel e no rodapé do menu (dois botões no DOM). `Modal` conforme §5/§3.5 (título `font-titulo` 600, overlay `bg-black/40 dark:bg-black/60`, `shadow-modal dark:shadow-none dark:border`, botão fechar com ícone `X` **mantendo `aria-label="Fechar"`**), mantendo toda a lógica atual. `RotaProtegida`: telas "Carregando..." e "Acesso negado" com tokens. As variáveis `--fc-*` vão só em `.fc` (os valores `rgb(var(--cor-*))` já trocam com o tema; `.dark .fc` é desnecessário).

- [ ] **Step 1: Testes**

```tsx
// ContadorPendentes.test.tsx — mock de api
it('mostra o número de pendentes', ...);            // usePendentes resolve 3 itens → "3"
it('fica oculto com zero', ...);
// Layout.test.tsx — MemoryRouter + QueryClientProvider; mock de useAuth ({ perfil, sair, expirarSessao }), de ../lib/api (apiMock) e de matchMedia
it('professor não renderiza contador e não chama /reservas/pendentes', async () => {
  // render com papel 'usuario'
  await new Promise((r) => setTimeout(r, 50));
  expect(apiMock.mock.calls.some((c) => c[0] === '/reservas/pendentes')).toBe(false);
});
it('admin chama /reservas/pendentes e vê o contador ao lado de Aprovações', ...); // controle positivo: some(c => c[0] === '/reservas/pendentes') === true
it('menu móvel: botão alterna aria-expanded e "Fechar menu"; Esc e clique em data-testid="backdrop-menu" fecham', ...);   // Review Focus 4
it('há dois BotaoTema (getAllByRole) sincronizados', ...);
// menu.test.ts: itens continuam os mesmos rótulos/rotas e cada um tem icone
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test`, `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(visual): menu lateral, contador de pendentes e modal"`.

---

### Task 5: Tela de login (painel dividido)

**Files:**
- Modify: `src/pages/Login.tsx`
- Test: `src/pages/Login.test.tsx` (criar)

Conforme §6.2: gradientes exatos (classes arbitrárias do Tailwind, ex.: `bg-[linear-gradient(135deg,#0B7A6E,#08695F)] dark:bg-[linear-gradient(135deg,#123A35,#0B1413)]`), texto do painel `text-primaria-botao-texto dark:text-texto`; logo trocado **só por CSS**, sem importar `useTema`: `<Logo variante="branca" className="dark:hidden" />` + `<Logo className="hidden dark:block" />`; frase e tamanhos (28 px ≥ `md`, 18 px abaixo, `min-h-[140px]`), grade decorativa `aria-hidden` (some < `md`) com quadradinhos `bg-coral` e `bg-primaria-botao-texto/80`; formulário em `Cartao` com `Campo`s e `Botao principal type="submit"` (`textoCarregando="Entrando..."`), erro em `erro`, "Sessão expirada. Entre novamente." em `coral-forte`. Sem `BotaoTema`.

- [ ] **Step 1: Teste** — renderiza a frase "Reserve a sala certa, sem conflito.", os campos E-mail/Senha continuam com os mesmos rótulos, a mensagem de sessão expirada aparece com `?expirada=1`, e não existe botão "Ativar modo …".
- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` (incluindo `AuthProvider.test.tsx`) → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(visual): login em painel dividido"`.

---

### Task 6: Calendário

**Files:**
- Modify: `src/calendario/eventos.ts`, `src/calendario/eventos.test.ts`, `src/pages/Calendario.tsx`, `src/pages/Calendario.test.tsx` (se necessário), `src/index.css`

**Interfaces:**
- Produces: `reservaParaEvento(r: ReservaDTO): EventInput` → `{ id, title, start, end, classNames: ['evento-aprovada'|'evento-pendente'|'evento-expirada'], extendedProps: { reserva: r } }` sem `backgroundColor`, `borderColor`, `textColor`; exporta `classeDoEvento(r: ReservaDTO): 'evento-aprovada'|'evento-pendente'|'evento-expirada'`.
- `Calendario.tsx`: `eventContent(arg)` depende de `arg.view.type` (ícone = `Check`/`Clock`/`History`, 12 px, `aria-hidden`):
  - `dayGridMonth`: `<span className="fc-daygrid-event-dot" />` + ícone + `<Hora className="font-bold">{arg.timeText}</Hora>` + título (o ponto pega a cor por `--fc-event-border-color`);
  - `listWeek`: ícone + título (o horário já tem coluna própria);
  - `timeGrid*`: ícone + `<Hora className="font-bold">{arg.timeText}</Hora>` + título com `truncate`.
  `eventDidMount` define `el.title = "<ROTULO_STATUS> · <título>"`.
- Filtros: `<Selecao rotulo="Filtrar por sala" rotuloOculto>` e `<Selecao rotulo="Filtrar por tipo" rotuloOculto>` com as mesmas opções de hoje; cada amostra de cor do fieldset de status é um `<span aria-hidden data-amostra="pendente|aprovada|expirada">` (o nome acessível do checkbox continua "Pendente"/"Aprovada"/"Expirada").

CSS em `src/index.css` conforme §6.3 (variáveis `--fc-*` no seletor `.fc`, foco, classes de evento só com variáveis, borda tracejada da expirada), mantendo o bloco `@media (max-width: 640px)` existente. Página: `Titulo` + `acao` "Nova reserva" (`Botao principal`, ícone `Plus`), filtros em `Cartao` com `Selecao`, fieldset de status com amostras (§6.3), FullCalendar em `Cartao`. **A lógica (refs, `buscarEventos` estável, toolbar responsiva, modais) não muda.**

- [ ] **Step 1: Testes**

```ts
it.each([['aprovada', false, 'evento-aprovada'], ['pendente', false, 'evento-pendente'], ['pendente', true, 'evento-expirada']])('%s (expirada=%s) → %s', ...);
it('não define cores inline', () => { const e = reservaParaEvento(r); expect(e).not.toHaveProperty('backgroundColor'); expect(e).not.toHaveProperty('borderColor'); expect(e).not.toHaveProperty('textColor'); });
// Calendario.test.tsx existente continua passando (contagem de buscas, getByLabelText('Filtrar por tipo')); acrescentar:
it('fieldset de status tem as 3 amostras', () => { ['pendente','aprovada','expirada'].forEach((s) => expect(container.querySelector(`[data-amostra="${s}"]`)).not.toBeNull()); });
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test`, `npm run typecheck`, `npm run build` (+ `rm -f dist/_redirects`) → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(visual): calendário com tokens, legenda e ícones de status"`.

---

### Task 7: Listas de reservas, aprovações e modais de reserva

**Files:**
- Modify: `src/components/ListaReservas.tsx`, `src/components/SeletorPeriodo.tsx`, `src/pages/Reservas.tsx`, `src/pages/Aprovacoes.tsx`, `src/calendario/ModalDetalhes.tsx`, `src/calendario/ModalNovaReserva.tsx`
- Test: `src/components/ListaReservas.test.tsx` (criar); ajustar `src/pages/Reservas.test.tsx`, `ModalDetalhes.test.tsx`, `ModalNovaReserva.test.tsx` só onde verificam texto/cor antigos

Conforme §6.4 e §6.6: linha-cartão com barra lateral por status (§3.3), sala + finalidade, **solicitante mantido**, `Hora`, `SeloStatus`, motivo de recusa em `erro-forte`. `ListaReservas` ganha a prop `vazio: { icone: LucideIcon; mensagem: string }`: Reservas passa `{ icone: CalendarX2, mensagem: 'Nenhuma reserva neste período' }` e Aprovações `{ icone: Inbox, mensagem: 'Nenhuma solicitação pendente' }` (substituem os textos atuais). Pílulas "Todas as reservas / Minhas" com `aria-pressed`; `SeletorPeriodo` com `Botao secundario` + `ChevronLeft`/`ChevronRight` mantendo os nomes acessíveis "Mês anterior"/"Próximo mês". Filtros de Reservas usam `<Selecao rotulo="Filtrar por sala" rotuloOculto>`. Modais usam `Campo`, `Selecao`, `Botao` (envio com `type="submit"`), `SeloStatus`, `Hora`, com `textoCarregando` preservando os textos atuais; o `textarea` do "Motivo da recusa" usa `classesCampo`.

- [ ] **Step 1: Testes**

```tsx
it('linha mostra sala, finalidade, solicitante, horário e selo', ...);
it('recusada mostra "Motivo: …" na linha', ...);
it('finalidade de 200 caracteres é truncada (classe truncate/line-clamp) e a linha tem min-w-0', ...); // Review Focus 2
it('lista vazia mostra a mensagem recebida em vazio (ex.: "Nenhuma solicitação pendente")', ...);
```

- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test` (todos os testes de Reservas/Modal* incluídos), `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(visual): listas de reservas, aprovações e modais"`.

---

### Task 8: Salas, Usuários, formulários e Relatórios

**Files:**
- Modify: `src/pages/Salas.tsx`, `src/pages/Usuarios.tsx`, `src/components/FormSala.tsx`, `src/components/FormUsuario.tsx`, `src/pages/Relatorios.tsx`
- Test: ajustar `src/components/FormSala.test.tsx` só se verificar texto/cor antigos

Conforme §6.5–6.6: `Titulo` com `acao` (Botao "Nova sala"/"Novo usuário", ícone `Plus`), tabela em `Cartao` (cabeçalho Manrope 700 `text-suave`, hover `superficie-2`, `overflow-x-auto` e colunas ocultas no celular mantidas), chips de recursos (`bg-superficie-2`), selo de situação (§6.5), botões de ação com `Botao`: Editar = `secundario`, Inativar = `perigo`, Reativar = `secundario`; formulários com `Campo`/`Selecao`/`Botao type="submit"` (`textoCarregando` com o texto atual, ex.: "Salvando..."); Relatórios conforme §6.6 (`textoCarregando="Gerando..."`). Lista vazia de salas/usuários → `EstadoVazio`.

- [ ] **Step 1: Teste** — `FormSala.test.tsx` continua passando; novo teste em `src/pages/Salas.test.tsx` (mock de `api`): o selo "Ativa" tem `bg-primaria-suave`, o selo "Inativa" tem `bg-neutro-suave`, cada recurso é um chip com `bg-superficie-2`, e o botão "Inativar" tem as classes da variante `perigo`.
- [ ] **Step 2: Falhar.** — `npm test` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Passar** — `npm test`, `npm run typecheck`, `npm run build` (+ `rm -f dist/_redirects`) → PASS. Também `grep -rnE "(slate|blue|amber|gray|white|red|green|yellow)-[0-9]|bg-white|text-white" src` → nenhuma ocorrência (Global Constraints).
- [ ] **Step 5: Commit** — `git commit -m "feat(visual): salas, usuários, formulários e relatórios"`.

---

### Task 9: Verificação visual e publicação (controller)

Executada pelo controller com Playwright, não por subagente implementador.

- [ ] **Step 1:** `npm test`, `npm run test:integracao`, `npm run typecheck` → tudo PASS (157+ unitários, 50 integração).
- [ ] **Step 2:** `npm run dev -- --offline --port 8888`; com o admin e com um professor de teste, percorrer em **claro e escuro** × **390 px e 1280 px**: login, telas "Carregando..." e "Acesso negado", calendário (mês, semana, dia e lista), minhas reservas, aprovações, salas, usuários, relatórios, modal de nova reserva, modal de detalhes. Checklist da §8: sem rolagem horizontal (`scrollWidth === innerWidth`); recarregar no escuro sem flash; inputs date/time/month e selects escuros; contador só para admin e sem `/reservas/pendentes` na aba de rede do professor; menu móvel fecha no backdrop/item/Esc; foco visível com Tab (botões do FC, eventos e dentro dos modais, nos dois temas); finalidade longa truncada; ponto colorido dos eventos na visão de mês.
- [ ] **Step 3:** Capturas de tela (claro/escuro, celular/desktop) apresentadas ao usuário para aprovação.
- [ ] **Step 4:** Com aprovação: `git push origin main`, aguardar o deploy e repetir uma amostra do Step 2 no site publicado.
