-- Salas de exemplo (idempotente: não duplica nomes já existentes).
insert into salas (nome, tipo, capacidade, recursos)
select v.nome, v.tipo::tipo_sala, v.capacidade, v.recursos
from (values
  ('Sala de Reunião 1', 'reuniao', 8, array['projetor', 'ar-condicionado']),
  ('Sala de Reunião 2', 'reuniao', 12, array['TV', 'videoconferência', 'quadro branco']),
  ('Biblioteca', 'biblioteca', 30, array['mesas de estudo', 'computadores']),
  ('Laboratório de Informática', 'laboratorio', 20, array['computadores', 'projetor'])
) as v(nome, tipo, capacidade, recursos)
where not exists (select 1 from salas s where lower(s.nome) = lower(v.nome));
