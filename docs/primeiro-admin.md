# Criar o primeiro administrador

O cadastro público está desligado no Supabase; o primeiro admin é criado manualmente.

1. Painel do Supabase (projeto de produção) → Authentication → Users → **Add user**, informe e-mail e senha e marque **Auto Confirm User**.
2. SQL Editor, executar (trocando o e-mail pelo usado no passo 1):

```sql
insert into perfis (id, nome, email, papel)
select id, 'Direção', email, 'admin' from auth.users where email = '<email>';
```

3. Entrar no sistema com esse e-mail e senha. Os demais usuários são criados pelo admin na tela de usuários.

Salas de exemplo (opcional): executar `supabase/salas-exemplo.sql` no SQL Editor.
