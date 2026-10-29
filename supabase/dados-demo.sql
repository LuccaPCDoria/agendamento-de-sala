-- Dados fictícios de demonstração (volume grande).
-- Marcação para limpeza (ver limpar-dados-demo.sql):
--   * usuários com e-mail @demo.example.com (domínio reservado, nenhum e-mail é entregue)
--   * salas com nome terminado em " (Demo)"
--   * finalidades das reservas começam com "[DEMO]"
-- As reservas demo ocupam só as salas demo; as salas reais ficam livres.
-- Senha de todos os usuários demo: Demo@2026
-- Não roda duas vezes: aborta se já houver usuários ou salas demo.

do $$
declare
  v_agora timestamptz := now();
  v_ini_periodo date := (now() at time zone 'America/Sao_Paulo')::date - 56;  -- 8 semanas atrás
  v_fim_periodo date := (now() at time zone 'America/Sao_Paulo')::date + 35;  -- 5 semanas à frente
  v_alvo int := 300;
  v_tentativas int := 0;
  v_inseridas int := 0;

  v_admins uuid[];
  v_usuarios uuid[];        -- usuários comuns ativos
  v_inativo uuid;           -- usuário comum inativo (só reservas passadas)
  v_salas_ativas uuid[];
  v_tipos_ativas tipo_sala[];
  v_sala_inativa uuid;
  v_tipo_inativa tipo_sala;

  v_i int; v_sala uuid; v_tipo tipo_sala; v_usuario uuid; v_e_admin boolean;
  v_dia date; v_hora_ini int; v_dur int;
  v_inicio timestamptz; v_fim timestamptz;
  v_criado timestamptz; v_t1 timestamptz; v_t2 timestamptz; v_limite timestamptz;
  v_status status_reserva; v_r float; v_reserva uuid; v_admin_decisor uuid;
  v_finalidade text; v_motivo text;

  f_reuniao text[] := array[
    'Reunião de planejamento semanal', 'Alinhamento com a coordenação', 'Reunião de pais e mestres',
    'Conselho de classe', 'Entrevista com candidato', 'Reunião do grêmio estudantil',
    'Planejamento pedagógico do bimestre', 'Atendimento a responsáveis', 'Reunião da equipe de TI',
    'Apresentação de projeto interdisciplinar', 'Treinamento de novos professores', 'Reunião de orçamento'];
  f_biblioteca text[] := array[
    'Grupo de estudos para o ENEM', 'Clube de leitura', 'Aula de pesquisa bibliográfica',
    'Oficina de redação', 'Monitoria de matemática', 'Sessão de contação de histórias',
    'Estudo dirigido de história', 'Preparação para olimpíada de física'];
  f_laboratorio text[] := array[
    'Aula prática de química', 'Experimento de física: óptica', 'Aula de programação em Python',
    'Prática de biologia: microscopia', 'Oficina de robótica', 'Avaliação prática de informática',
    'Feira de ciências: montagem', 'Curso de planilhas eletrônicas', 'Aula de introdução à eletrônica'];
  motivos text[] := array[
    'Sala reservada para evento da direção neste horário.',
    'Capacidade da sala insuficiente para a turma informada.',
    'Manutenção programada no ar-condicionado.',
    'Solicitação duplicada; já existe reserva equivalente.',
    'Use outro laboratório, que está livre neste horário.',
    'Finalidade não compatível com o tipo de sala.'];
begin
  if exists (select 1 from perfis where email like '%@demo.example.com')
     or exists (select 1 from salas where nome like '% (Demo)') then
    raise exception 'Dados demo já existem. Rode limpar-dados-demo.sql antes.';
  end if;

  perform setseed(0.42);

  -- ── Usuários ─────────────────────────────────────────────────────────────
  create temp table demo_usuarios (nome text, email text, papel papel_usuario, ativo boolean) on commit drop;
  insert into demo_usuarios values
    ('Mariana Costa (Demo)',      'mariana.costa@demo.example.com',      'admin',   true),
    ('Ricardo Almeida (Demo)',    'ricardo.almeida@demo.example.com',    'admin',   true),
    ('Ana Beatriz Souza',         'ana.souza@demo.example.com',          'usuario', true),
    ('Bruno Oliveira',            'bruno.oliveira@demo.example.com',     'usuario', true),
    ('Carla Mendes',              'carla.mendes@demo.example.com',       'usuario', true),
    ('Daniel Ferreira',           'daniel.ferreira@demo.example.com',    'usuario', true),
    ('Eduarda Lima',              'eduarda.lima@demo.example.com',       'usuario', true),
    ('Felipe Santos',             'felipe.santos@demo.example.com',      'usuario', true),
    ('Gabriela Rocha',            'gabriela.rocha@demo.example.com',     'usuario', true),
    ('Henrique Barbosa',          'henrique.barbosa@demo.example.com',   'usuario', true),
    ('Isabela Martins',           'isabela.martins@demo.example.com',    'usuario', true),
    ('João Pedro Ribeiro',        'joao.ribeiro@demo.example.com',       'usuario', true),
    ('Larissa Carvalho',          'larissa.carvalho@demo.example.com',   'usuario', true),
    ('Marcelo Gomes',             'marcelo.gomes@demo.example.com',      'usuario', true),
    ('Natália Pereira',           'natalia.pereira@demo.example.com',    'usuario', true),
    ('Otávio Nascimento',         'otavio.nascimento@demo.example.com',  'usuario', true),
    ('Paula Teixeira',            'paula.teixeira@demo.example.com',     'usuario', true),
    ('Rafael Cardoso',            'rafael.cardoso@demo.example.com',     'usuario', true),
    ('Sofia Araújo',              'sofia.araujo@demo.example.com',       'usuario', true),
    ('Tiago Monteiro',            'tiago.monteiro@demo.example.com',     'usuario', false);

  create temp table demo_ids on commit drop as
    select gen_random_uuid() as id, * from demo_usuarios;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
         extensions.crypt('Demo@2026', extensions.gen_salt('bf')), v_agora,
         '{"provider":"email","providers":["email"]}', '{}', v_agora - interval '70 days', v_agora,
         '', '', '', ''
  from demo_ids;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
         'email', v_agora, v_agora - interval '70 days', v_agora
  from demo_ids;

  insert into perfis (id, nome, email, papel, ativo, criado_em)
  select id, nome, email, papel, ativo, v_agora - interval '70 days' from demo_ids;

  select array_agg(id) into v_admins from demo_ids where papel = 'admin';
  select array_agg(id) into v_usuarios from demo_ids where papel = 'usuario' and ativo;
  select id into v_inativo from demo_ids where not ativo;

  -- ── Salas demo (8, 1 delas inativa) ──────────────────────────────────────
  create temp table demo_salas (id uuid, tipo tipo_sala, ativa boolean) on commit drop;
  with inseridas as (
    insert into salas (nome, tipo, capacidade, recursos, ativa, criado_em)
    select v.nome || ' (Demo)', v.tipo::tipo_sala, v.capacidade, v.recursos, v.ativa, v_agora - interval '70 days'
    from (values
      ('Sala de Reunião 3',          'reuniao',     6,  array['TV', 'quadro branco'], true),
      ('Auditório',                  'reuniao',     80, array['projetor', 'sistema de som', 'microfone', 'ar-condicionado'], true),
      ('Sala da Coordenação',        'reuniao',     10, array['videoconferência', 'ar-condicionado'], true),
      ('Biblioteca Infantil',        'biblioteca',  25, array['tapete de leitura', 'acervo infantil'], true),
      ('Sala de Estudos Silenciosa', 'biblioteca',  15, array['mesas individuais', 'tomadas'], true),
      ('Laboratório de Ciências',    'laboratorio', 24, array['bancadas', 'capela de exaustão', 'microscópios'], true),
      ('Laboratório de Robótica',    'laboratorio', 16, array['kits de robótica', 'impressora 3D', 'computadores'], true),
      ('Laboratório de Línguas',     'laboratorio', 30, array['fones de ouvido', 'computadores'], false)
    ) as v(nome, tipo, capacidade, recursos, ativa)
    returning id, tipo, ativa
  )
  insert into demo_salas select * from inseridas;

  select array_agg(id), array_agg(tipo) into v_salas_ativas, v_tipos_ativas from demo_salas where ativa;
  select id, tipo into v_sala_inativa, v_tipo_inativa from demo_salas where not ativa;

  -- ── Reservas + histórico ──────────────────────────────────────────────────
  while v_inseridas < v_alvo and v_tentativas < 5000 loop
    v_tentativas := v_tentativas + 1;

    -- dia útil (seg–sáb)
    v_dia := v_ini_periodo + floor(random() * (v_fim_periodo - v_ini_periodo + 1))::int;
    continue when extract(isodow from v_dia) = 7;

    -- sala: a inativa só recebe reservas antigas (antes de ser desativada)
    if random() < 0.04 and v_dia < (v_agora at time zone 'America/Sao_Paulo')::date - 20 then
      v_sala := v_sala_inativa;
      v_tipo := v_tipo_inativa;
    else
      v_i := 1 + floor(random() * array_length(v_salas_ativas, 1))::int;
      v_sala := v_salas_ativas[v_i];
      v_tipo := v_tipos_ativas[v_i];
    end if;

    -- horário: concentrado entre 8h e 18h, às vezes à noite; sábado só de manhã
    v_dur := (array[30, 45, 60, 60, 60, 90, 90, 120, 120, 180])[1 + floor(random() * 10)::int];
    if extract(isodow from v_dia) = 6 then
      v_hora_ini := 8 * 60 + floor(random() * 8)::int * 30;            -- 8h–11h30
    elsif random() < 0.85 then
      v_hora_ini := 8 * 60 + floor(random() * 20)::int * 30;           -- 8h–17h30
    else
      v_hora_ini := 18 * 60 + floor(random() * 7)::int * 30;           -- 18h–21h
    end if;
    continue when v_hora_ini + v_dur > 23 * 60;

    v_inicio := (v_dia + make_interval(mins => v_hora_ini)) at time zone 'America/Sao_Paulo';
    v_fim := v_inicio + make_interval(mins => v_dur);

    -- solicitante: 12% admins, inativo só no passado distante
    v_r := random();
    if v_r < 0.12 then
      v_usuario := v_admins[1 + floor(random() * array_length(v_admins, 1))::int];
    elsif v_r < 0.16 and v_inicio < v_agora - interval '25 days' then
      v_usuario := v_inativo;
    else
      v_usuario := v_usuarios[1 + floor(random() * array_length(v_usuarios, 1))::int];
    end if;
    v_e_admin := v_usuario = any (v_admins);
    v_admin_decisor := v_admins[1 + floor(random() * array_length(v_admins, 1))::int];

    -- criada de 4 horas a ~14 dias antes do início (nunca no futuro)
    v_criado := least(v_inicio - make_interval(hours => 4 + floor(random() * 330)::int),
                      v_agora - make_interval(mins => 30 + floor(random() * 600)::int));
    continue when v_criado >= v_inicio;
    v_limite := least(v_inicio, v_agora);

    -- status final
    v_r := random();
    if v_e_admin then
      v_status := case when v_r < 0.9 then 'aprovada' else 'cancelada' end;
    elsif v_inicio < v_agora then
      v_status := case when v_r < 0.66 then 'aprovada' when v_r < 0.78 then 'recusada'
                       when v_r < 0.90 then 'cancelada' else 'pendente' end;   -- pendente passada = expirada
    else
      v_status := case when v_r < 0.45 then 'aprovada' when v_r < 0.80 then 'pendente'
                       when v_r < 0.88 then 'recusada' else 'cancelada' end;
    end if;

    -- conflito com reservas ativas (mesma regra da constraint)
    if v_status in ('pendente', 'aprovada') then
      continue when exists (
        select 1 from reservas
        where sala_id = v_sala and status in ('pendente', 'aprovada')
          and tstzrange(inicio, fim, '[)') && tstzrange(v_inicio, v_fim, '[)'));
    end if;

    v_finalidade := '[DEMO] ' || case v_tipo
      when 'reuniao' then f_reuniao[1 + floor(random() * array_length(f_reuniao, 1))::int]
      when 'biblioteca' then f_biblioteca[1 + floor(random() * array_length(f_biblioteca, 1))::int]
      else f_laboratorio[1 + floor(random() * array_length(f_laboratorio, 1))::int] end;
    v_motivo := case when v_status = 'recusada'
      then motivos[1 + floor(random() * array_length(motivos, 1))::int] end;

    -- instantes das transições, sempre entre a criação e min(início, agora)
    v_t1 := v_criado + (v_limite - v_criado) * (0.1 + random() * 0.4);
    v_t2 := v_t1 + (v_limite - v_t1) * (0.2 + random() * 0.6);

    insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade, motivo_recusa, criado_em, atualizado_em)
    values (v_sala, v_usuario, v_inicio, v_fim, v_status, v_finalidade, v_motivo, v_criado,
            case when v_status = 'pendente' or (v_e_admin and v_status = 'aprovada') then v_criado
                 when v_status = 'cancelada' and not v_e_admin then v_t2 else v_t1 end)
    returning id into v_reserva;

    if v_e_admin then
      insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por, alterado_em)
      values (v_reserva, null, 'aprovada', v_usuario, v_criado);
      if v_status = 'cancelada' then
        insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por, alterado_em)
        values (v_reserva, 'aprovada', 'cancelada', v_usuario, v_t1);
      end if;
    else
      insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por, alterado_em)
      values (v_reserva, null, 'pendente', v_usuario, v_criado);
      if v_status in ('aprovada', 'recusada') then
        insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por, alterado_em)
        values (v_reserva, 'pendente', v_status, v_admin_decisor, v_t1);
      elsif v_status = 'cancelada' then
        if random() < 0.5 then
          -- aprovada e depois cancelada pelo próprio solicitante
          insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por, alterado_em)
          values (v_reserva, 'pendente', 'aprovada', v_admin_decisor, v_t1),
                 (v_reserva, 'aprovada', 'cancelada', v_usuario, v_t2);
        else
          -- cancelada ainda pendente
          insert into historico_reservas (reserva_id, status_anterior, status_novo, alterado_por, alterado_em)
          values (v_reserva, 'pendente', 'cancelada', v_usuario, v_t2);
        end if;
      end if;
    end if;

    v_inseridas := v_inseridas + 1;
  end loop;

  raise notice 'Reservas demo inseridas: % (tentativas: %)', v_inseridas, v_tentativas;
end $$;
