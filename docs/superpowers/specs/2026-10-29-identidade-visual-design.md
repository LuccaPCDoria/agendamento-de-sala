# Identidade Visual — Especificação de Design

- **Data:** 2026-10-29
- **Sistema:** Agendamento de Salas (spec funcional: `docs/superpowers/specs/2026-10-27-agendamento-salas-design.md`)
- **Escopo:** somente aparência do front-end (`src/`). Nenhuma regra de negócio, rota da API, esquema de banco ou comportamento muda. E-mails e relatório PDF ficam como estão.

## 1. Objetivo e critérios de sucesso

**Problema:** o sistema usa o visual padrão do Tailwind (azul, cinzas, fonte do sistema) e parece genérico.

**Objetivo:** dar ao sistema uma identidade própria — amigável, moderna e marcante — com modo escuro.

**Critérios de sucesso:**
1. Todas as telas (login, menu, calendário, listas, formulários, modais) usam a nova paleta, tipografia, formas, ícones e logo.
2. Modo escuro automático (segue o sistema) com botão para trocar; sem "piscar" claro ao abrir no escuro.
3. Pares de cor principais atendem WCAG AA (≥ 4,5:1), verificado por teste automático.
4. Nenhuma tela rola na horizontal em 390 px; desktop (1280 px) preservado.
5. Todos os testes existentes continuam passando (ajustes só em asserções de texto/cor antigas).

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

### 3.1 Cores

Definidas em `src/tema/tokens.css` como trios RGB (ex.: `--cor-primaria: 15 159 143;`), em `:root` (claro) e `.dark` (escuro), e expostas no Tailwind como `rgb(var(--cor-x) / <alpha-value>)`.

| Token (Tailwind) | Claro | Escuro | Uso |
|---|---|---|---|
| `fundo` | `#F3FAF8` | `#0B1413` | fundo da página |
| `superficie` | `#FFFFFF` | `#132220` | cartões, menu, modais |
| `superficie-2` | `#E6F4F1` | `#1A2D2A` | campos, hover, chips |
| `borda` | `#D7ECE8` | `#22403B` | bordas e divisórias |
| `texto` | `#10302C` | `#E3F1EE` | texto principal |
| `suave` | `#5B7470` | `#8FA9A4` | texto secundário |
| `primaria` | `#0F9F8F` | `#2BC4B2` | destaques, ícones, item ativo, aprovada |
| `primaria-botao` | `#0B7A6E` | `#2BC4B2` | fundo de botão principal |
| `primaria-botao-texto` | `#FFFFFF` | `#062420` | texto do botão principal |
| `primaria-suave` | `#DFF4F0` | `#123A35` | fundo de selo/menu ativo |
| `primaria-forte` | `#08695F` | `#5FD8C9` | texto sobre `primaria-suave` |
| `coral` | `#FF7A59` | `#FF8E70` | pendente, contador, detalhes do logo |
| `coral-suave` | `#FFE6DE` | `#3A211A` | fundo do selo pendente |
| `coral-forte` | `#B4472B` | `#FF9E85` | texto do selo pendente |
| `erro` | `#D93F3F` | `#FF6B6B` | erros, recusada |
| `erro-suave` | `#FDE3E3` | `#3A1B1B` | fundo do selo recusada |
| `erro-forte` | `#B42E2E` | `#FF8A8A` | texto do selo recusada / motivo |
| `neutro-suave` | `#E9EEED` | `#1E2A28` | fundo dos selos cancelada/expirada |
| `neutro-forte` | `#4A605C` | `#A3BAB5` | texto dos selos cancelada/expirada |
| `evento-expirada` | `#C4D3D0` | `#2E403C` | evento expirado no calendário |

**Contraste:** o verde `primaria` (#0F9F8F) com texto branco não atinge 4,5:1; por isso botões usam `primaria-botao`. Na revisão da spec, dois pares da prévia ficaram abaixo de 4,5:1 e foram escurecidos: texto do selo aprovada no claro (`primaria-forte` → `#08695F`) e texto dos selos cancelada/expirada (novo token `neutro-forte`). O teste de contraste (§8) é a fonte de verdade: se algum par falhar, o token é ajustado até passar, mantendo o tom.

### 3.2 Selos de status

| Status | Fundo | Texto | Observação |
|---|---|---|---|
| Aprovada | `primaria-suave` | `primaria-forte` | |
| Pendente | `coral-suave` | `coral-forte` | |
| Recusada | `erro-suave` | `erro-forte` | |
| Cancelada | `neutro-suave` | `neutro-forte` | |
| Expirada | `neutro-suave` | `neutro-forte` | borda tracejada |

Eventos no calendário: aprovada = `primaria`, pendente = `coral`, expirada = `evento-expirada` (texto `texto`).

### 3.3 Tipografia

Pacotes `@fontsource/unbounded`, `@fontsource/manrope`, `@fontsource/space-mono` (servidos pelo próprio site, sem Google Fonts). Tailwind: `font-titulo`, `font-texto` (padrão do `body`), `font-numero`.

| Fonte | Onde | Pesos |
|---|---|---|
| Unbounded | títulos de página, títulos de modal, nome no login/menu | 600, 800 |
| Manrope | todo o resto (texto, rótulos, campos, botões, tabelas, menu, mensagens, título da semana do FullCalendar) | 400, 500, 700, 800 |
| Space Mono | horários, datas numéricas, números do relatório e contadores | 400, 700 |

Regra: Unbounded só em textos curtos (≤ ~25 caracteres); o título do período do FullCalendar usa Manrope.

### 3.4 Formas e sombras

- Raios: cartões e modais `16px`; campos e selects `12px`; botões e selos em pílula.
- Sombra (claro): `0 4px 14px rgba(15,159,143,.08)` em cartões; escuro: sem sombra, só borda `borda`.

## 4. Modo escuro

- `src/tema/useTema.ts` expõe `{ tema: 'claro' | 'escuro', alternar(): void }`.
  - Preferência salva em `localStorage` na chave `agendamento:tema` (`'claro' | 'escuro'`); todo acesso em try/catch.
  - Sem preferência salva → segue `prefers-color-scheme` e acompanha mudanças do sistema.
  - Aplica/remove a classe `dark` no `<html>`.
- `index.html` ganha um script inline mínimo no `<head>` que aplica `dark` antes da renderização (mesma regra), evitando o "flash" claro.
- `BotaoTema` (ícones sol/lua do lucide) fica no rodapé do menu lateral e no cabeçalho do celular; `aria-label` "Ativar modo escuro" / "Ativar modo claro".
- Tailwind: `darkMode: 'class'`.

## 5. Componentes base (`src/ui/`)

| Componente | Responsabilidade |
|---|---|
| `Botao` | variantes `principal`, `secundario` (contorno), `perigo`, `discreto`; prop `carregando` (desabilita e mostra texto de carregamento); pílula |
| `Cartao` | superfície com raio 16, borda/sombra conforme tema |
| `Campo` | rótulo + input + mensagem de erro (`role="alert"`), estilos de foco com anel `primaria` |
| `Selecao` | rótulo + select com o mesmo visual do `Campo` |
| `SeloStatus` | recebe `status` e `expirada` e aplica a tabela 3.2 com o rótulo de `ROTULO_STATUS` |
| `Logo` | SVG do "calendário confirmado"; props `tamanho` e `comNome` |
| `Titulo` | `h1` em Unbounded + subtítulo opcional em `suave` |
| `Hora` | `<span>` em Space Mono para horários e datas numéricas |
| `EstadoVazio` | ícone + mensagem amigável para listas vazias |

O `Modal` existente mantém a lógica e recebe o visual novo (título em `Titulo`, ações no rodapé). O favicon passa a ser o `Logo` (SVG em `public/`).

## 6. Telas

- **Layout:** menu lateral `superficie` com `Logo comNome`, itens com ícones lucide (Calendário, Minhas reservas, Aprovações, Salas, Usuários, Relatórios), item ativo em pílula `primaria-suave`. "Aprovações" mostra um contador coral com o número de pendentes (apenas admin; usa `usePendentes()` já existente; oculto quando zero). Rodapé: nome, selo "Direção"/"Professor", `BotaoTema`, "Sair". Celular: cabeçalho com logo, `BotaoTema` e botão de menu; o menu abre sobre o conteúdo.
- **Login:** painel dividido — à esquerda painel em gradiente menta com `Logo`, a frase "Reserve a sala certa, sem conflito." e uma grade de calendário decorativa (CSS); à direita o formulário em `Cartao`. Em ≤ 640 px o painel vira faixa no topo. Mensagens de erro e "Sessão expirada" mantidas.
- **Calendário:** `Titulo` "Calendário" + subtítulo "Veja a ocupação e reserve em poucos cliques"; botão "Nova reserva" (`Botao principal`); filtros num `Cartao`; legenda de cores (Aprovada, Pendente, Expirada); FullCalendar dentro de `Cartao`, com as variáveis `--fc-*` mapeadas para os tokens (fundo, bordas, texto, botões da toolbar, destaque do dia atual, seleção) e horários do eixo em Space Mono.
- **Minhas reservas / Aprovações:** cada reserva vira um `Cartao` em linha com barra lateral na cor do status, sala e finalidade, data/horário com `Hora`, `SeloStatus` e, quando recusada, o motivo visível na própria linha; clique abre o `ModalDetalhes` como hoje. Lista vazia → `EstadoVazio`.
- **Salas / Usuários:** tabela dentro de `Cartao` com hover de linha; recursos como chips `superficie-2`; situação como selo (Ativa/Ativo = `primaria-suave` + `primaria-forte`; Inativa/Inativo = `neutro-suave` + `neutro-forte`). Regras responsivas atuais mantidas.
- **Relatórios:** `Cartao` com seletor de mês e `Botao` "Baixar PDF".
- **Modais (`ModalNovaReserva`, `ModalDetalhes`, formulários):** usam `Campo`, `Selecao`, `Botao`, `SeloStatus`, `Hora`.

## 7. Dependências novas

`lucide-react`, `@fontsource/unbounded`, `@fontsource/manrope`, `@fontsource/space-mono`. Nenhuma outra.

## 8. Testes e verificação

**Novos testes (Vitest):**
- `useTema`: segue o sistema sem preferência; `alternar()` troca e persiste; reage à mudança do sistema quando não há preferência; funciona se `localStorage` lançar erro.
- `BotaoTema`: `aria-label` correto em cada tema; clique alterna.
- `SeloStatus`: rótulo e classes de cada status, incluindo expirada.
- **Contraste:** `tests/unit/contraste.test.ts` lê os valores de `tokens.css` e verifica ≥ 4,5:1 para, em cada tema: `texto`/`fundo`, `texto`/`superficie`, `suave`/`superficie`, `primaria-botao-texto`/`primaria-botao`, e texto/fundo de cada selo da tabela 3.2.
- `eventos.ts`: cores dos eventos usando os tokens.

**Testes existentes:** os 157 unitários e 50 de integração devem continuar passando; asserções de texto/cor do visual antigo são atualizadas e listadas no relatório.

**Verificação manual (controller, Playwright):** todas as telas em claro e escuro, em 390 px e 1280 px; sem rolagem horizontal; sem flash ao abrir no escuro; capturas de tela apresentadas ao usuário antes do push.

**Publicação:** somente após aprovação do usuário; conferência no site publicado.

## 9. Fora do escopo

- E-mails e relatório PDF.
- Mudanças de comportamento, textos de regras de negócio ou API.
- Animações elaboradas (somente transições curtas de cor/hover).
