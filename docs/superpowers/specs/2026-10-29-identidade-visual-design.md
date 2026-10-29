# Identidade Visual — Especificação de Design

- **Data:** 2026-10-29 (revisada após revisão técnica)
- **Sistema:** Agendamento de Salas (spec funcional: `docs/superpowers/specs/2026-10-27-agendamento-salas-design.md`)
- **Escopo:** somente aparência do front-end (`src/`, `index.html`, `public/`). Nenhuma regra de negócio, rota da API, esquema de banco ou comportamento muda; nenhuma chamada nova à API é feita por quem não a fazia antes. E-mails e relatório PDF ficam como estão.

## 1. Objetivo e critérios de sucesso

**Problema:** o sistema usa o visual padrão do Tailwind (azul, cinzas, fonte do sistema) e parece genérico.

**Objetivo:** dar ao sistema uma identidade própria — amigável, moderna e marcante — com modo escuro.

**Critérios de sucesso:**
1. Todas as telas (login, menu, calendário, listas, formulários, modais) usam a nova paleta, tipografia, formas, ícones e logo.
2. Modo escuro automático (segue o sistema) com botão para trocar; sem "piscar" claro ao abrir no escuro; controles nativos (data, hora, mês, select, checkbox, barras de rolagem) também ficam escuros.
3. Todo par texto/fundo usado na interface atinge **WCAG AA 4,5:1**, e bordas de campos, anel de foco e amostras de cor atingem **3:1** — verificado por teste automático (§8).
4. Nenhuma tela rola na horizontal em 390 px; desktop (1280 px) preservado.
5. Todos os testes existentes continuam passando (ajustes só em asserções de texto/cor antigas, listados no relatório).

## 2. Decisões de identidade (aprovadas)

| Item | Decisão |
|---|---|
| Personalidade | "Vibrante e amigável": cantos arredondados, sombras suaves, visual de app moderno |
| Paleta | **Menta & coral** |
| Nome | Mantém **"Agendamento de Salas"** |
| Logo | **Calendário confirmado**: quadrado arredondado menta, calendário branco com topo coral e um "check" |
| Login | **Painel dividido** |
| Modo escuro | Automático (sistema) + botão para trocar, escolha salva no navegador |
| Tipografia | **Unbounded** (títulos) · **Manrope** (texto) · **Space Mono** (horários/números) |
| Ícones | biblioteca `lucide-react` |
| Abordagem técnica | Tokens em variáveis CSS + componentes base reutilizáveis |

## 3. Tokens de design

### 3.1 Formato do arquivo de tokens

`src/tema/tokens.css` contém **exatamente dois blocos**: `:root {` (claro) e `.dark {` (escuro). Cada token de cor é **uma declaração por linha** no formato `--cor-<nome>: R G B;` (trio decimal separado por espaços). Os dois blocos têm o mesmo conjunto de nomes. No Tailwind cada token é exposto como `rgb(var(--cor-<nome>) / <alpha-value>)` com o nome `<nome>` (ex.: `bg-superficie`, `text-suave`).

Os blocos também declaram `color-scheme: light;` (`:root`) e `color-scheme: dark;` (`.dark`), e `accent-color: rgb(var(--cor-primaria-botao));` no `:root` (vale para os dois temas, para checkboxes e controles nativos).

### 3.2 Cores

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `fundo` | `#F3FAF8` | `#0B1413` | fundo da página |
| `superficie` | `#FFFFFF` | `#132220` | cartões, menu, modais |
| `superficie-2` | `#E6F4F1` | `#1A2D2A` | fundo de campos, hover de linha, chips |
| `borda` | `#D7ECE8` | `#22403B` | divisórias e bordas decorativas (nunca para delimitar campo) |
| `borda-campo` | `#728B86` | `#668380` | borda de `Campo`, `Selecao` e botão secundário (checkboxes nativos usam `accent-color` + `color-scheme`) |
| `texto` | `#10302C` | `#E3F1EE` | texto principal |
| `suave` | `#4F6864` | `#8FA9A4` | texto secundário |
| `primaria` | `#0F9F8F` | `#2BC4B2` | **somente** elementos não-textuais: ícones, anel de foco, barras laterais, detalhes do logo |
| `primaria-forte` | `#08695F` | `#5FD8C9` | texto em destaque/links e texto sobre `primaria-suave` |
| `primaria-suave` | `#DFF4F0` | `#123A35` | fundo do item ativo do menu, selo aprovada, pílula ativa |
| `primaria-botao` | `#0B7A6E` | `#2BC4B2` | fundo do botão principal |
| `primaria-botao-texto` | `#FFFFFF` | `#062420` | texto do botão principal |
| `coral` | `#FF7A59` | `#FF8E70` | fundo do contador e do evento pendente, detalhes do logo |
| `coral-texto` | `#10302C` | `#062420` | texto sobre `coral` |
| `coral-suave` | `#FFE6DE` | `#3A211A` | fundo do selo pendente |
| `coral-forte` | `#B4472B` | `#FF9E85` | texto do selo pendente, mensagem "Sessão expirada" |
| `erro` | `#C53030` | `#FF6B6B` | texto de erro (`role="alert"`), fundo do botão perigo, barra lateral de recusada |
| `erro-texto` | `#FFFFFF` | `#2A0E0E` | texto do botão perigo |
| `erro-suave` | `#FDE3E3` | `#3A1B1B` | fundo do selo recusada |
| `erro-forte` | `#B42E2E` | `#FF8A8A` | texto do selo recusada e do motivo da recusa |
| `neutro-suave` | `#E9EEED` | `#1E2A28` | fundo dos selos cancelada/expirada |
| `neutro-forte` | `#4A605C` | `#A3BAB5` | texto dos selos cancelada/expirada, borda tracejada da expirada, barra lateral de cancelada/expirada |
| `evento-aprovada` | `#0B7A6E` | `#2BC4B2` | fundo do evento aprovado no calendário |
| `evento-aprovada-texto` | `#FFFFFF` | `#062420` | texto do evento aprovado |
| `evento-expirada` | `#C4D3D0` | `#2E403C` | fundo do evento expirado (com borda tracejada `neutro-forte`) |

Regras:
- **`primaria` nunca é cor de texto** (3,29:1 sobre branco). Texto em destaque usa `primaria-forte`.
- **Anel de foco:** `ring-2 ring-primaria ring-offset-2 ring-offset-superficie`, sempre externo ao elemento (nunca `ring-inset`).
- Evento pendente usa `coral` + `coral-texto`.
- **Coral como forma (amostra da legenda, bloco do evento pendente):** sempre com borda de 1 px `coral-forte` — o `coral` sozinho tem 2,57:1 contra branco e não atinge 3:1 no tema claro.

### 3.3 Status (selos, barras laterais e eventos)

| Status | Selo (fundo / texto) | Barra lateral da linha | Evento no calendário (fundo / texto) |
|---|---|---|---|
| Aprovada | `primaria-suave` / `primaria-forte` | `primaria` | `evento-aprovada` / `evento-aprovada-texto` |
| Pendente | `coral-suave` / `coral-forte` | `coral` | `coral` / `coral-texto`, borda `coral-forte` |
| Recusada | `erro-suave` / `erro-forte` | `erro` | — (não aparece no calendário) |
| Cancelada | `neutro-suave` / `neutro-forte` | `neutro-forte` | — |
| Expirada | `neutro-suave` / `neutro-forte`, borda tracejada `neutro-forte` | `neutro-forte` | `evento-expirada` / `texto`, borda tracejada `neutro-forte` |

### 3.4 Tipografia

Pacotes `@fontsource/unbounded`, `@fontsource/manrope`, `@fontsource/space-mono`, importados **por peso** (`@fontsource/<fonte>/<peso>.css`) em `src/main.tsx`; cada arquivo já inclui latin/latin-ext por `unicode-range` (acentos do português) e usa `font-display: swap`. Tailwind: `font-titulo` (`Unbounded, system-ui, sans-serif`), `font-texto` (`Manrope, system-ui, sans-serif`, padrão do `body`), `font-numero` (`"Space Mono", ui-monospace, monospace`).

| Fonte | Peso | Onde |
|---|---|---|
| Unbounded | 800 | títulos de página (`Titulo`), "Agendamento de Salas" no login e no menu, frase do login (exceção à regra de tamanho, ver §6.2) |
| Unbounded | 600 | títulos de modal |
| Manrope | 400 | texto corrido, campos |
| Manrope | 500 | rótulos, itens de menu inativos |
| Manrope | 700 | botões, selos, item de menu ativo, cabeçalhos de tabela, título do período do FullCalendar |
| Space Mono | 400 | datas e horários em listas e eixo do calendário (`Hora`) |
| Space Mono | 700 | horário dentro do evento do calendário, contador de pendentes |

Unbounded só em textos curtos (≤ ~25 caracteres).

### 3.5 Formas, sombras e camadas

- Raios: cartões e modais `16px`; campos e selects `12px`; botões, selos e chips em pílula.
- Sombra (claro): cartões `0 4px 14px rgba(15,159,143,.08)`; modais `0 20px 50px rgba(16,48,44,.18)`. No escuro: `dark:shadow-none` e borda `borda`.
- Overlay do `Modal`: `bg-black/40` no claro, `bg-black/60` no escuro.
- Camadas: menu móvel `z-40` (com backdrop `z-30`), `Modal` `z-50`.

## 4. Modo escuro

- **Módulo único `src/tema/tema.ts`:** exporta `CHAVE_TEMA = 'agendamento:tema'`, `resolverTema(salvo: string | null, prefereEscuro: boolean): 'claro' | 'escuro'` (salvo `'claro'|'escuro'` vence; senão segue `prefereEscuro`) e uma pequena *store* (`iniciarTema()`, `obterTema()`, `assinar(cb)`, `alternar()`) que aplica/remove a classe `dark` no `<html>`.
- `iniciarTema()` é chamado uma vez em `src/main.tsx` (antes do `render`) e registra o listener do sistema já no carregamento — assim a tela de login, que não monta `useTema`, também acompanha a troca de tema do sistema. Todo uso de `matchMedia` é protegido (`window.matchMedia?.(…)`; ausente = claro), pois o jsdom não o implementa.
- **`useTema()`** usa `useSyncExternalStore` sobre essa store e retorna `{ tema, alternar }` — todos os `BotaoTema` montados ao mesmo tempo ficam sincronizados.
- Sem preferência salva, a store escuta `matchMedia('(prefers-color-scheme: dark)')` e acompanha mudanças do sistema. `alternar()` grava a escolha explícita em `localStorage` (try/catch); **não há opção de voltar ao automático** (decisão consciente — YAGNI).
- **Script pré-pintura** inline no `<head>` do `index.html` (antes de qualquer outro script) replica a mesma regra com a mesma chave e o mesmo media query, com try/catch próprio. Um teste (§8) garante que o `index.html` contém `agendamento:tema` e `(prefers-color-scheme: dark)`. Não há CSP configurada hoje no Netlify; se uma for adicionada, o script precisará de hash.
- **`BotaoTema`** (ícones `Sun`/`Moon` do lucide) fica no rodapé do menu lateral e no cabeçalho do celular; `aria-label` "Ativar modo escuro" / "Ativar modo claro". **A tela de login não tem o botão** — segue o tema efetivo.
- Tailwind: `darkMode: 'class'`.

## 5. Componentes base (`src/ui/`)

| Componente | Responsabilidade |
|---|---|
| `Botao` | variantes `principal` (`primaria-botao`/`primaria-botao-texto`), `secundario` (contorno `borda-campo`, texto `primaria-forte`), `perigo` (`erro`/`erro-texto`), `discreto` (sem fundo, texto `suave`); props `carregando: boolean` e `textoCarregando?: string` (quando carregando: desabilitado e mostra `textoCarregando`, ou o próprio conteúdo se ausente); pílula; anel de foco §3.2 |
| `Cartao` | superfície com raio 16, borda/sombra conforme tema |
| `Campo` | rótulo + input + mensagem de erro (`role="alert"`, cor `erro`); fundo `superficie-2`, borda `borda-campo`, anel de foco §3.2 |
| `Selecao` | rótulo + select com o mesmo visual do `Campo` |
| `SeloStatus` | recebe `status` e `expirada` e aplica a tabela 3.3 com o rótulo de `ROTULO_STATUS` |
| `Logo` | SVG do "calendário confirmado"; props `tamanho`, `comNome` e `variante: 'padrao' \| 'branca'`. `padrao`: quadrado `primaria`, calendário `superficie`, topo `coral`, check `primaria` (cores do tema ativo). `branca` (para o painel do login): quadrado `#FFFFFF`, calendário `#E6F4F1`, topo `coral`, check `#0B7A6E` |
| `Titulo` | `h1` em Unbounded 800 + subtítulo opcional em `suave` |
| `Hora` | `<span>` em Space Mono 400 para horários e datas numéricas |
| `EstadoVazio` | ícone lucide + mensagem amigável para listas vazias |

O `Modal` existente mantém a lógica (Escape, foco, rótulo) e recebe o visual novo (título em Unbounded 600, ações no rodapé, overlay e sombra §3.5). O favicon passa a ser o `Logo` em SVG (`public/favicon.svg`).

## 6. Telas

### 6.1 Layout
- **Desktop (≥ 768 px):** menu lateral fixo `superficie` com `Logo comNome`, itens com ícones lucide (`CalendarDays` Calendário, `ListChecks` Minhas reservas, `BadgeCheck` Aprovações, `DoorOpen` Salas, `Users` Usuários, `FileText` Relatórios). Item ativo: pílula `primaria-suave` com texto `primaria-forte` (Manrope 700); inativos: texto `suave` (Manrope 500).
- **Contador de pendentes:** componente `ContadorPendentes`, **renderizado só quando `perfil.papel === 'admin'`** (o professor nunca chama `/reservas/pendentes`). Usa `usePendentes()` existente (cache `['pendentes']`); mostra o número em pílula `coral`/`coral-texto` (Space Mono 700) ao lado de "Aprovações"; oculto quando zero ou carregando.
- **Rodapé do menu:** nome, selo "Direção" (`primaria-suave`/`primaria-forte`) ou "Professor" (`neutro-suave`/`neutro-forte`), `BotaoTema`, botão "Sair" (`discreto`).
- **Celular (< 768 px):** cabeçalho `superficie` com `Logo` (sem nome), `BotaoTema` e botão de menu (`Menu`/`X`). O menu abre como **painel sobreposto** à esquerda (`z-40`) com backdrop (`z-30`, `bg-black/40`); fecha ao clicar no backdrop, ao escolher um item ou com Esc.

### 6.2 Login
- **≥ 768 px:** duas colunas. Esquerda: painel com `linear-gradient(135deg, #0B7A6E, #08695F)` no claro e `linear-gradient(135deg, #123A35, #0B1413)` no escuro; texto `#FFFFFF` no claro e `texto` no escuro; `Logo variante="branca"` no claro e `padrao` no escuro, frase "Reserve a sala certa, sem conflito." em Unbounded 800 a 28 px (exceção explícita à regra de ≤ 25 caracteres) e "Agendamento de Salas" em Manrope 500; grade decorativa de 4×3 quadradinhos arredondados (CSS puro, `aria-hidden`), alguns em `coral` e branco. Direita: formulário em `Cartao`.
- **< 768 px:** o painel vira faixa no topo com `min-height: 140px` (cresce se precisar), `Logo` + frase em Unbounded 800 a 18 px; a grade decorativa some.
- Mensagens: erro de login em `erro`; "Sessão expirada. Entre novamente." em `coral-forte`. Textos existentes mantidos.

### 6.3 Calendário
- `Titulo` "Calendário" + subtítulo "Veja a ocupação e reserve em poucos cliques"; botão "Nova reserva" (`Botao principal`, ícone `Plus`).
- Filtros num `Cartao`: selects de sala e tipo (`Selecao`) e o **fieldset de status existente, que passa a ser a legenda**: cada checkbox (Pendente, Aprovada, Expirada) ganha ao lado uma amostra 12×12 com a cor do evento (§3.3; pendente com borda `coral-forte`, expirada com borda tracejada `neutro-forte`). Comportamento dos filtros inalterado.
- FullCalendar dentro de `Cartao`. Variáveis declaradas no seletor `.fc` (e `.dark .fc`) em `src/index.css`: `--fc-page-bg-color: rgb(var(--cor-superficie))`, `--fc-border-color: rgb(var(--cor-borda))`, `--fc-neutral-bg-color: rgb(var(--cor-superficie-2))`, `--fc-neutral-text-color: rgb(var(--cor-suave))`, `--fc-button-text-color: rgb(var(--cor-primaria-forte))`, `--fc-button-bg-color: rgb(var(--cor-superficie))`, `--fc-button-border-color: rgb(var(--cor-borda-campo))`, `--fc-button-hover-bg-color: rgb(var(--cor-superficie-2))`, `--fc-button-hover-border-color: rgb(var(--cor-borda-campo))`, `--fc-button-active-bg-color: rgb(var(--cor-primaria-suave))`, `--fc-button-active-border-color: rgb(var(--cor-primaria))`, `--fc-today-bg-color: rgb(var(--cor-primaria) / .08)`, `--fc-highlight-color: rgb(var(--cor-primaria) / .18)`, `--fc-now-indicator-color: rgb(var(--cor-coral))`, `--fc-non-business-color: rgb(var(--cor-superficie-2) / .6)`, `--fc-list-event-hover-bg-color: rgb(var(--cor-superficie-2))`. `color: rgb(var(--cor-texto))` em `.fc`. Título do período em Manrope 700; eixo de horas em Space Mono 400.
- **Foco:** o anel §3.2 (`box-shadow` com `primaria` e offset `superficie`, `outline: none`) é aplicado em `.fc .fc-button:focus`, `.fc .fc-button-primary:focus`, `.fc .fc-button-primary:not(:disabled).fc-button-active:focus`, `.fc .fc-button-primary:not(:disabled):active:focus` e `.fc .fc-event:focus-visible` (os eventos têm `tabIndex=0`).
- **Cores dos eventos por classe:** `reservaParaEvento` deixa de definir `backgroundColor`, `borderColor` **e `textColor`** (as constantes de cor antigas são removidas) e passa a retornar `classNames: ['evento-aprovada' | 'evento-pendente' | 'evento-expirada']`. Em `src/index.css`, essas classes **definem apenas variáveis do FullCalendar**, que o próprio FC aplica no lugar certo em cada visão (bloco na semana/dia, ponto no mês e na lista):
  - `.fc .evento-aprovada { --fc-event-bg-color: rgb(var(--cor-evento-aprovada)); --fc-event-border-color: rgb(var(--cor-evento-aprovada)); --fc-event-text-color: rgb(var(--cor-evento-aprovada-texto)); }`
  - `.fc .evento-pendente { --fc-event-bg-color: rgb(var(--cor-coral)); --fc-event-border-color: rgb(var(--cor-coral-forte)); --fc-event-text-color: rgb(var(--cor-coral-texto)); }`
  - `.fc .evento-expirada { --fc-event-bg-color: rgb(var(--cor-evento-expirada)); --fc-event-border-color: rgb(var(--cor-neutro-forte)); --fc-event-text-color: rgb(var(--cor-texto)); }` e `.fc .fc-v-event.evento-expirada, .fc .fc-h-event.evento-expirada { border-style: dashed; }`
  - Nunca definir `color`/`background` diretamente nessas classes (na lista e no mês o elemento raiz fica sobre `superficie`).
- **Status não só por cor (WCAG 1.4.1):** o conteúdo do evento (`eventContent`) mostra, antes do horário, um ícone lucide de 12 px `aria-hidden` — `Check` (aprovada), `Clock` (pendente), `History` (expirada) — e o atributo `title` do evento inclui o rótulo do status.

### 6.4 Minhas reservas / Aprovações (`ListaReservas`)
- Cada reserva vira uma linha-cartão (`Cartao`, hover `superficie-2`) com: barra lateral de 5 px na cor do status (§3.3), **sala e finalidade** (Manrope 700 / 400), **solicitante** (`suave`, mantido como hoje), data e horário com `Hora`, `SeloStatus` e, quando recusada, "Motivo: …" em `erro-forte` na própria linha. Clique abre o `ModalDetalhes` como hoje.
- Lista vazia → `EstadoVazio` ("Nenhuma reserva neste período" / "Nenhuma solicitação pendente").
- Página Reservas: alternador "Todas as reservas / Minhas" (admin) vira grupo de pílulas — ativa `primaria-suave`/`primaria-forte`, inativa `discreto` — mantendo `aria-pressed`. `SeletorPeriodo`: botões anterior/próximo `secundario` com ícones `ChevronLeft`/`ChevronRight` e o mês em Manrope 700. Select de sala e checkboxes de status com `Selecao` e `accent-color`.

### 6.5 Salas / Usuários
Tabela dentro de `Cartao` (cabeçalho Manrope 700 `suave`, hover de linha `superficie-2`); recursos como chips `superficie-2`/`texto`; situação como selo (Ativa/Ativo = `primaria-suave`/`primaria-forte`; Inativa/Inativo = `neutro-suave`/`neutro-forte`). Regras responsivas atuais mantidas (colunas ocultas em telas pequenas, `overflow-x-auto`).

### 6.6 Relatórios e modais
- Relatórios: `Cartao` com `Campo` de mês e `Botao principal` "Baixar PDF" (ícone `Download`, `textoCarregando` "Gerando...").
- `ModalNovaReserva`, `ModalDetalhes`, `FormSala`, `FormUsuario`: usam `Campo`, `Selecao`, `Botao`, `SeloStatus`, `Hora`. Os textos de carregamento existentes são preservados **exatamente** (com três pontos: "Enviando...", "Entrando...", "Salvando..." etc.) via `textoCarregando`.

## 7. Dependências novas

`lucide-react`, `@fontsource/unbounded`, `@fontsource/manrope`, `@fontsource/space-mono`. Nenhuma outra.

## 8. Testes e verificação

**Novos testes (Vitest):**
- `tema.ts` / `useTema`: `resolverTema` (salvo vence; sem salvo segue o sistema); a store aplica/remove `dark` no `<html>`; `alternar()` troca e persiste; reage à mudança do sistema quando não há preferência; funciona se `localStorage` lançar erro; dois `BotaoTema` montados ficam sincronizados.
- `index.html`: contém `agendamento:tema` e `(prefers-color-scheme: dark)`.
- `BotaoTema`: `aria-label` correto em cada tema; clique alterna.
- `SeloStatus`: rótulo e classes de cada status, incluindo expirada.
- `ContadorPendentes`: não renderiza para professor (e não chama a API); mostra o número para admin; oculto com zero.
- `eventos.ts`: `classNames` corretos para aprovada, pendente e expirada, sem `backgroundColor`, `borderColor` nem `textColor` (o `src/calendario/eventos.test.ts` atual, que compara hex antigos, é reescrito).
- **Contraste — `tests/unit/contraste.test.ts`:** lê `src/tema/tokens.css`, extrai os dois blocos no formato §3.1, falha se algum token existir num bloco e faltar no outro, e verifica, **para cada tema**, a tabela de pares `[frente, fundo, mínimo]`:
  - 4,5: `texto`/`fundo`, `texto`/`superficie`, `texto`/`superficie-2`, `texto`/`primaria-suave`, `suave`/`fundo`, `suave`/`superficie`, `suave`/`superficie-2`, `suave`/`primaria-suave`, `primaria-forte`/`superficie`, `primaria-forte`/`primaria-suave`, `primaria-forte`/`superficie-2`, `erro-forte`/`superficie-2`, `primaria-botao-texto`/`primaria-botao`, `coral-texto`/`coral`, `coral-forte`/`coral-suave`, `coral-forte`/`superficie`, `erro`/`superficie`, `erro`/`fundo`, `erro-texto`/`erro`, `erro-forte`/`erro-suave`, `erro-forte`/`superficie`, `neutro-forte`/`neutro-suave`, `neutro-forte`/`superficie`, `evento-aprovada-texto`/`evento-aprovada`, `texto`/`evento-expirada`.
  - 3,0: `borda-campo`/`superficie`, `borda-campo`/`superficie-2`, `primaria`/`superficie`, `primaria`/`fundo`, `neutro-forte`/`superficie` (borda tracejada da expirada), `neutro-forte`/`evento-expirada`, `coral-forte`/`superficie` (borda da amostra/evento pendente), `evento-aprovada`/`superficie` (amostra/evento aprovado).
  - Se algum par falhar durante a implementação, o token é ajustado mantendo o tom até passar.

**Testes existentes:** os 157 unitários e 50 de integração devem continuar passando; asserções de texto/cor do visual antigo são atualizadas e listadas no relatório.

**Verificação manual (controller, Playwright):** login, calendário (semana e lista), minhas reservas, aprovações, salas, usuários, relatórios, modal de nova reserva e modal de detalhes — em claro e escuro, em 390 px e 1280 px. Checklist: sem rolagem horizontal; sem flash ao recarregar no escuro; inputs de data/hora/mês e selects escuros no tema escuro; contador visível para admin e ausente (e sem chamada a `/reservas/pendentes` na aba de rede) para professor; menu móvel fecha no backdrop/item/Esc. Capturas de tela apresentadas ao usuário antes do push.

**Publicação:** somente após aprovação do usuário; conferência no site publicado.

## 9. Fora do escopo

- E-mails e relatório PDF.
- Mudanças de comportamento, textos de regras de negócio ou API.
- Voltar ao tema automático depois de escolher um (botão "automático").
- Animações elaboradas (somente transições curtas de cor/hover).
- Política de segurança de conteúdo (CSP).
