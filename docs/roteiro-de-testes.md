# Roteiro de testes manuais (site publicado)

Preencha as colunas **Obtido** e **Data** durante a execução. Use `<site>` para a URL publicada no Netlify.
Tenha à mão: uma conta admin, e-mails reais para os professores de teste (para conferir as caixas de entrada) e o DevTools aberto (F12).

## 1. Verificações obrigatórias de publicação (fazer primeiro)

A regra `/api/*` precisa vir **antes** do fallback da SPA em `public/_redirects`; se a ordem estiver errada, a API devolve HTML.

| Passo | Esperado | Obtido | Data |
|---|---|---|---|
| 1.1 Abrir `<site>/api/me` no navegador (sem login) | JSON `{"erro":"Faça login para continuar."}` (**não** HTML) | | |
| 1.2 Abrir `<site>/salas` direto (F5, sem login) | O app carrega (redireciona para `/login`), sem erro 404 do Netlify | | |

## 2. Roteiro funcional

| Passo | Esperado | Obtido | Data |
|---|---|---|---|
| 2.1 Login com senha errada | Mensagem "E-mail ou senha incorretos." | | |
| 2.2 Login como admin | Entra no calendário; menu mostra Aprovações, Salas, Usuários e Relatórios | | |
| 2.3 Admin cria uma sala (tela Salas) | Sala aparece na listagem | | |
| 2.4 Admin cria um professor (tela Usuários) com senha inicial | Professor aparece na listagem | | |
| 2.5 Sair e entrar como professor | Menu sem telas de admin; acessar `/salas` mostra "Acesso negado" | | |
| 2.6 Professor reserva a sala (filtro de sala ativo, arrastar no horário livre, finalidade, confirmar) | Reserva aparece **amarela** (pendente); nenhum e-mail é enviado na criação (RNF001) | | |
| 2.7 Professor tenta reservar horário sobreposto | Modal fica aberto com mensagem de conflito (409) | | |
| 2.8 Admin aprova a reserva (Aprovações) | Reserva fica **verde**; professor recebe e-mail de aprovação | | |
| 2.9 Professor cria outra reserva; admin **recusa** informando motivo | Motivo é obrigatório; professor recebe e-mail com o motivo; reserva some do calendário e aparece em Histórico como recusada | | |
| 2.10 Professor cria outra reserva e a **cancela** | Status cancelada; e-mail de cancelamento chega; horário fica livre | | |
| 2.11 Conferir e-mails de cada mudança (criação, aprovação, recusa, cancelamento) | Um e-mail por mudança, com sala, data, horário, status e link do sistema | | |
| 2.12 Admin cria reserva própria | Nasce **aprovada** (verde); e-mail "Reserva confirmada" | | |
| 2.13 Professor faz 2 reservas futuras na sala nova e outra pessoa faz 1; admin **inativa a sala** | Aviso antes de confirmar; reservas futuras desaparecem do calendário; **um único e-mail por pessoa** listando todas as reservas canceladas | | |
| 2.14 Admin **inativa o professor** | Reservas futuras dele canceladas, um e-mail com a lista | | |
| 2.15 Tentar logar com o professor inativo | Mensagem "Usuário inativo. Procure a direção." | | |
| 2.16 Admin reativa o professor e a sala | Voltam a funcionar; reservas canceladas **não** são restauradas | | |
| 2.17 Expiração de sessão: logado, no DevTools → Application → Local Storage, editar `agendamento:ultimaAtividade` para um instante de mais de 30 min atrás (milissegundos; no Console: `localStorage.setItem('agendamento:ultimaAtividade', String(Date.now() - 31*60*1000))`) e aguardar até 1 min (ou recarregar) | Volta para `/login` com "Sessão expirada" | | |
| 2.18 Celular (DevTools → modo dispositivo, ou aparelho real) | Calendário abre na visão de lista; menu hambúrguer; "Nova reserva" cria a reserva | | |
| 2.19 Clicar em uma reserva (dono ou admin) | Modal de detalhes mostra o histórico de mudanças de status; para outro professor o histórico não aparece | | |
| 2.20 Filtros do calendário (sala, tipo, status) e do Histórico (período, sala, status) | Listas mudam conforme o filtro | | |
| 2.20b Filtros de Aprovações (busca, sala, tipo, de/até), Salas (busca, tipo, situação, capacidade mínima) e Usuários (busca, perfil, situação) | Lista reduz conforme o filtro; contador "x de y" atualiza; busca sem acento encontra nomes acentuados; "Limpar filtros" restaura; sem resultado mostra "Nenhum resultado para os filtros" | | |
| 2.21 Relatórios: escolher um mês e baixar o PDF | PDF abre com acentos corretos (ç, ã, é) e as reservas do mês | | |
| 2.22 Deixar o sistema parado ~10 min (função ociosa) e criar uma reserva | E-mail chega normalmente (envio não depende de conexão antiga) | | |

## 3. Medição de desempenho (RNF001: criar reserva em até 2 s)

**Como medir:** DevTools → aba Network, marcar "Preserve log", filtrar por `Fetch/XHR`. Criar a reserva e anotar o **Time** da requisição `POST /api/reservas` (coluna Time ou aba Timing). Use horários livres diferentes a cada tentativa e cancele depois para limpar.

- **Cold start:** 5 medições, cada uma após ~15 min sem usar o sistema (a função "dorme").
- **Quente:** 5 medições seguidas, uma logo após a outra.

| # | Cold start (ms) | Quente (ms) |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| **Mediana** | | |

**Regra (spec §6):** a medição em produção passou de 2 s; o e-mail "Solicitação recebida" foi removido (mantidos `confirmada` e os demais). Registrar a decisão abaixo.

**Decisão registrada:** _(e-mail de criação removido em 2026-10-27; mediana quente > 2 s)_

Data das medições: ____ / Responsável: ____
