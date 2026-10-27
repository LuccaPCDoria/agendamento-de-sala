import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { criarSalaTeste, criarUsuarioTeste, limparBanco, sqlTeste } from './ajuda';
import type { Perfil, Sala } from '../../shared/tipos';

let s: Sala;
let s2: Sala;
let u: Perfil;

beforeEach(async () => {
  await limparBanco();
  s = await criarSalaTeste();
  s2 = await criarSalaTeste();
  u = (await criarUsuarioTeste('usuario')).perfil;
});
afterAll(async () => {
  await limparBanco();
  await sqlTeste.end();
});

const ins = (sala: string, usuario: string, i: string, f: string, status = 'pendente') =>
  sqlTeste`insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade)
    values (${sala}, ${usuario}, ${i}, ${f}, ${status}, 'x')`;

describe('constraint reservas_sem_conflito', () => {
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
  it('salas diferentes não conflitam', async () => {
    await ins(s.id, u.id, '2026-11-03T13:00Z', '2026-11-03T14:00Z');
    await expect(ins(s2.id, u.id, '2026-11-03T13:00Z', '2026-11-03T14:00Z')).resolves.toBeDefined();
  });
  it('nome de sala duplicado ignora maiúsculas → 23505 salas_nome_unico', async () => {
    await criarSalaTeste('Lab 1');
    await expect(criarSalaTeste('LAB 1')).rejects.toMatchObject({ code: '23505', constraint_name: 'salas_nome_unico' });
  });
});
