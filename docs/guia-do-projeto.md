# Guia do projeto — para quem está chegando agora

Este guia explica o Sistema de Agendamento de Salas sem pressupor que você já viu o código. Leia de cima para baixo: primeiro **o que** o sistema faz, depois **como usar**, por último **como ele é feito por dentro**.

- Sistema publicado: https://agendamento-de-sala.netlify.app
- Repositório: https://github.com/LuccaPCDoria/agendamento-de-sala
- Documento original do trabalho (requisitos): `Projeto_ Agendamento de Salas.docx`
- Detalhes técnicos completos: [README](../README.md) e [especificação](superpowers/specs/2026-10-27-agendamento-salas-design.md)

---

## 1. O problema e a solução

**Problema:** na instituição, as salas são reservadas sem um controle central. Duas pessoas acabam marcando a mesma sala no mesmo horário.

**Solução:** um site onde:

1. o **professor** pede uma sala para um dia e horário;
2. a **direção** aprova ou recusa o pedido;
3. o sistema **nunca deixa** duas reservas ativas da mesma sala se sobreporem — nem se duas pessoas clicarem ao mesmo tempo.

Tudo fica registrado (quem pediu, quem aprovou, quando) e o professor recebe **e-mail** quando o status da reserva muda.

## 2. Quem usa e o que cada um pode fazer

| Perfil | No sistema aparece como | Pode |
|---|---|---|
| Professor | **Usuário** | Ver o calendário, pedir reservas, cancelar as próprias, ver o próprio histórico |
| Direção | **Admin** | Tudo do professor **+** aprovar/recusar pedidos, cancelar qualquer reserva, cadastrar salas e usuários, baixar relatório em PDF |

- **Não existe "criar conta".** Só o admin cadastra pessoas.
- Reserva feita por um **admin** já nasce **aprovada**; feita por um **professor** nasce **pendente** e espera a direção.

## 3. As regras de uma reserva

- Funciona de **segunda a sábado, das 07:00 às 23:00** (horário de Brasília). Domingo é bloqueado.
- Começa e termina **no mesmo dia**, dura **pelo menos 15 minutos** e precisa de uma **finalidade** (ex.: "Aula de química").
- Não dá para reservar no passado.

### Os status

| Status | Cor no calendário | Significa |
|---|---|---|
| **Pendente** | amarelo/coral | Professor pediu; aguardando a direção |
| **Aprovada** | verde | Confirmada — a sala é sua |
| **Recusada** | (some do calendário) | A direção recusou e escreveu o motivo |
| **Cancelada** | (some do calendário) | O dono ou a direção cancelou |
| **Expirada** | cinza tracejado | Ficou pendente e o horário passou sem ninguém aprovar |

```
                 aprovar (admin)
   pendente ─────────────────────▶ aprovada
      │  │                              │
      │  └── recusar (admin, c/ motivo) │
      │            ▼                    │
      │        recusada                 │
      └──── cancelar (dono ou admin) ◀──┘
                   ▼
               cancelada
```

### E-mails

O professor recebe e-mail quando a reserva é **aprovada**, **recusada** (com o motivo) ou **cancelada**, e o admin recebe "Reserva confirmada" quando ele mesmo reserva. **Ao pedir** uma reserva não sai e-mail (foi retirado para o sistema responder em menos de 2 segundos). Se a direção **inativar uma sala ou uma pessoa**, as reservas futuras são canceladas e cada afetado recebe **um único e-mail** com a lista.

## 4. As telas

| Tela | Quem vê | Para que serve |
|---|---|---|
| **Login** | todos | E-mail e senha. Após 30 min sem mexer, o sistema desconecta sozinho |
| **Calendário** | todos | Ver a ocupação por dia/semana/mês/lista e reservar arrastando sobre um horário livre (ou no botão "Nova reserva"). Filtros: sala, tipo de sala, status |
| **Minhas reservas** | todos | Lista do mês com status, motivo de recusa e histórico. O admin pode alternar entre "Todas as reservas" e "Minhas". Filtros: mês, sala, status |
| **Aprovações** | admin | Fila de pedidos pendentes para aprovar ou recusar. Filtros: busca por solicitante/finalidade, sala, tipo, período |
| **Salas** | admin | Cadastrar, editar, inativar/reativar salas. Filtros: busca por nome/recurso, tipo, situação, capacidade mínima |
| **Usuários** | admin | Cadastrar, editar (inclusive trocar senha), inativar/reativar pessoas. Filtros: busca por nome/e-mail, perfil, situação |
| **Relatórios** | admin | Escolher um mês e baixar o PDF com todas as reservas |

Nos filtros de Aprovações, Salas e Usuários: a busca ignora acentos e maiúsculas ("joao" acha "João"), aparece um contador ("12 de 52") e o botão **Limpar filtros**.

**Reservar em 3 cliques:** no Calendário, filtre pela sala → arraste sobre o horário livre → escreva a finalidade → Confirmar.

## 5. Como testar agora (dados de demonstração)

O sistema publicado está com **dados fictícios** para a demonstração: 20 pessoas, 8 salas extras e 300 reservas espalhadas de setembro a dezembro.

| Para entrar como | E-mail | Senha |
|---|---|---|
| Direção (admin) | `mariana.costa@demo.example.com` | `Demo@2026` |
| Professor | `ana.souza@demo.example.com` | `Demo@2026` |

- Tudo que é demonstração é fácil de reconhecer: e-mails `@demo.example.com`, salas terminadas em **"(Demo)"** e finalidades começando com **"[DEMO]"**.
- Os e-mails `@demo.example.com` não existem — mensagens enviadas para eles voltam como "não entregue" para a caixa do Gmail do sistema.
- Para apagar tudo depois: rodar `supabase/limpar-dados-demo.sql` no SQL Editor do Supabase. Para recriar: `supabase/dados-demo.sql`.

Roteiro passo a passo de testes: [roteiro-de-testes.md](roteiro-de-testes.md).

## 6. Como o sistema é feito (por dentro)

Três peças, cada uma num serviço gratuito na nuvem:

```
 ┌───────────────────────────┐
 │ 1. SITE (o que você vê)   │  React — roda no navegador
 └─────────────┬─────────────┘
               │  pede/envia dados pela internet (/api/...)
 ┌─────────────▼─────────────┐
 │ 2. API (as regras)        │  Express numa "Netlify Function"
 └─────────────┬─────────────┘
               │  lê e grava
 ┌─────────────▼─────────────┐
 │ 3. BANCO DE DADOS         │  PostgreSQL no Supabase
 └───────────────────────────┘
```

1. **Site (front-end)** — as telas. Feito em **React** com **TypeScript**, estilizado com **Tailwind**, calendário com **FullCalendar**. Fica hospedado no **Netlify**.
2. **API (back-end)** — recebe os pedidos do site, confere permissões e regras (horário, quem pode aprovar…) e fala com o banco. Também envia os e-mails (Gmail, via **Nodemailer**). Roda no próprio Netlify, como "função".
3. **Banco de dados** — **PostgreSQL** no **Supabase**. O Supabase também cuida do **login** (senhas guardadas com criptografia).

**A regra mais importante — "nunca duas reservas na mesma sala e horário" — é garantida pelo próprio banco.** Existe uma regra no PostgreSQL (uma *constraint de exclusão*) que recusa qualquer reserva ativa que se sobreponha a outra. Por isso, mesmo que duas pessoas cliquem "Confirmar" no mesmo milissegundo, só uma consegue; a outra vê "conflito".

### As tabelas do banco

| Tabela | Guarda |
|---|---|
| `perfis` | Pessoas: nome, e-mail, papel (usuário/admin), ativo ou não |
| `salas` | Salas: nome, tipo (reunião, biblioteca, laboratório), capacidade, recursos, ativa ou não |
| `reservas` | Quem reservou qual sala, de quando até quando, status, finalidade, motivo da recusa |
| `historico_reservas` | Cada mudança de status: de qual para qual, quem mudou e quando |

### Onde fica cada coisa no código

| Pasta | O que tem |
|---|---|
| `src/` | As telas (React). `src/pages/` = uma tela por arquivo |
| `server/` | A API, em camadas: `routes` (endereços) → `controllers` (recebe o pedido) → `services` (regras de negócio) → `repositories` (SQL) |
| `shared/` | Regras usadas pelos dois lados: horários, validações |
| `supabase/` | Estrutura do banco (`migrations/`) e scripts dos dados de demonstração |
| `tests/` e `*.test.ts(x)` | Testes automáticos (mais de 300) |
| `docs/` | Esta documentação |

## 7. Perguntas que podem aparecer na apresentação

- **"E se duas pessoas reservarem ao mesmo tempo?"** — O banco recusa a segunda (constraint de exclusão). Há testes automáticos de concorrência provando isso.
- **"Por que o professor não recebe e-mail ao pedir?"** — O requisito RNF001 exige resposta em até 2 s; o envio do e-mail ultrapassava esse tempo, então foi retirado só nesse momento.
- **"As senhas são seguras?"** — Ficam no Supabase Auth, criptografadas (bcrypt). Ninguém, nem a direção, consegue ver a senha.
- **"Funciona no celular?"** — Sim. O calendário abre em formato de lista e o menu vira um botão.
- **"O que é uma reserva expirada?"** — Um pedido pendente cujo horário passou sem ninguém aprovar. Ele não muda no banco, só aparece cinza.
- **"Dá para criar conta sozinho?"** — Não, de propósito: só a direção cadastra pessoas.

## 8. Glossário

| Termo | Em português simples |
|---|---|
| Front-end | A parte que aparece na tela |
| Back-end / API | A parte "por trás", que aplica as regras e fala com o banco |
| Banco de dados | Onde as informações ficam guardadas |
| Deploy | Publicar uma nova versão do site |
| Netlify | Serviço que hospeda o site e a API |
| Supabase | Serviço que hospeda o banco e o login |
| Constraint | Regra gravada no banco que ele mesmo faz cumprir |
| Commit / push | Salvar uma versão do código / enviá-la ao GitHub |
| Teste automatizado | Programa que confere sozinho se o sistema funciona |
