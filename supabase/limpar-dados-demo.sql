-- Remove tudo o que dados-demo.sql inseriu.
--   * Reservas demo: todas as de usuários demo e todas com finalidade "[DEMO]".
--   * Histórico que um admin demo gerou em reserva real é preservado e passa para
--     o admin real mais antigo (aborta se não houver nenhum).
--   * Sala demo com reserva real não é tocada: o script avisa e você decide.

do $$
declare
  v_admin_real uuid;
  v_mantidas text;
begin
  create temp table demo_perfis on commit drop as
    select id from perfis where email like '%@demo.example.com';

  create temp table demo_reservas on commit drop as
    select id from reservas
    where usuario_id in (select id from demo_perfis) or finalidade like '[DEMO]%';

  create temp table demo_salas on commit drop as
    select id, nome from salas where nome like '% (Demo)';

  if exists (
    select 1 from historico_reservas
    where alterado_por in (select id from demo_perfis)
      and reserva_id not in (select id from demo_reservas)
  ) then
    select id into v_admin_real from perfis
    where papel = 'admin' and id not in (select id from demo_perfis)
    order by criado_em limit 1;
    if v_admin_real is null then
      raise exception 'Há histórico de admin demo em reserva real e nenhum admin real para assumi-lo.';
    end if;
    update historico_reservas set alterado_por = v_admin_real
    where alterado_por in (select id from demo_perfis)
      and reserva_id not in (select id from demo_reservas);
  end if;

  delete from historico_reservas where reserva_id in (select id from demo_reservas);
  delete from reservas where id in (select id from demo_reservas);

  delete from perfis where id in (select id from demo_perfis);
  delete from auth.users where id in (select id from demo_perfis);  -- identities caem em cascata

  select string_agg(nome, ', ') into v_mantidas from demo_salas d
  where exists (select 1 from reservas r where r.sala_id = d.id);
  if v_mantidas is not null then
    raise notice 'Salas demo mantidas por terem reservas reais: %', v_mantidas;
  end if;

  delete from salas
  where id in (select id from demo_salas)
    and not exists (select 1 from reservas r where r.sala_id = salas.id);
end $$;
