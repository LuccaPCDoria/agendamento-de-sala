import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { criarApp } from '../../server/app';
import { criarSalaTeste, criarUsuarioTeste, depsIntegracao, encerrarConexoes, limparBanco, sqlTeste } from './ajuda';

beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await encerrarConexoes();
});

const app = () => criarApp(depsIntegracao());
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const H = 3600000;
const ids = (corpo: { id: string }[]) => corpo.map((r) => r.id);

async function inserir(salaId: string, usuarioId: string, inicio: Date, horas: number, status: string) {
  const [r] = await sqlTeste<{ id: string }[]>`
    insert into reservas (sala_id, usuario_id, inicio, fim, status, finalidade)
    values (${salaId}, ${usuarioId}, ${inicio}, ${new Date(inicio.getTime() + horas * H)}, ${status}, 'Teste')
    returning id`;
  return r.id;
}
const q = (ini: Date, fim: Date, extra = '') =>
  `/api/reservas?inicio=${encodeURIComponent(ini.toISOString())}&fim=${encodeURIComponent(fim.toISOString())}${extra}`;

describe('GET /api/reservas', () => {
  it('professor não vê recusada/cancelada de outro no calendário', async () => {
    const prof = await criarUsuarioTeste('usuario');
    const outro = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const base = new Date(Date.now() + 5 * 24 * H);
    const ok = await inserir(sala.id, outro.perfil.id, base, 1, 'aprovada');
    await inserir(sala.id, outro.perfil.id, new Date(base.getTime() + 2 * H), 1, 'recusada');
    await inserir(sala.id, outro.perfil.id, new Date(base.getTime() + 4 * H), 1, 'cancelada');
    const ini = new Date(base.getTime() - H);
    const fim = new Date(base.getTime() + 10 * H);
    const res = await request(app()).get(q(ini, fim)).set(auth(prof.token));
    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([ok]);
    const r2 = await request(app()).get(q(ini, fim, '&status=recusada')).set(auth(prof.token));
    expect(r2.status).toBe(400);
    expect(JSON.stringify(r2.body)).toContain('Filtro de status não permitido.');
  });
  it('minhas=true traz recusada própria', async () => {
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const base = new Date(Date.now() + 5 * 24 * H);
    const id = await inserir(sala.id, prof.perfil.id, base, 1, 'recusada');
    const res = await request(app())
      .get(q(new Date(base.getTime() - H), new Date(base.getTime() + 3 * H), '&minhas=true'))
      .set(auth(prof.token));
    expect(ids(res.body)).toEqual([id]);
  });
  it('reserva das 9h–11h aparece numa janela 10h–12h (sobreposição)', async () => {
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const nove = new Date(Date.now() + 5 * 24 * H);
    nove.setUTCMinutes(0, 0, 0);
    const id = await inserir(sala.id, prof.perfil.id, nove, 2, 'aprovada');
    const res = await request(app())
      .get(q(new Date(nove.getTime() + H), new Date(nove.getTime() + 3 * H)))
      .set(auth(prof.token));
    expect(ids(res.body)).toEqual([id]);
    const fora = await request(app())
      .get(q(new Date(nove.getTime() + 2 * H), new Date(nove.getTime() + 4 * H)))
      .set(auth(prof.token));
    expect(fora.body).toEqual([]);
  });
  it('pendente no passado é expirada: só aparece com filtro expirada', async () => {
    const admin = await criarUsuarioTeste('admin');
    const sala = await criarSalaTeste();
    const passado = new Date(Date.now() - 2 * 24 * H);
    const id = await inserir(sala.id, admin.perfil.id, passado, 1, 'pendente');
    const ini = new Date(passado.getTime() - H);
    const fim = new Date(passado.getTime() + 3 * H);
    const res = await request(app()).get(q(ini, fim, '&status=expirada')).set(auth(admin.token));
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id, expirada: true });
    const so = await request(app()).get(q(ini, fim, '&status=pendente')).set(auth(admin.token));
    expect(so.body).toEqual([]);
  });
  it('DTO não expõe solicitanteEmail', async () => {
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const base = new Date(Date.now() + 5 * 24 * H);
    await inserir(sala.id, prof.perfil.id, base, 1, 'aprovada');
    const res = await request(app())
      .get(q(new Date(base.getTime() - H), new Date(base.getTime() + 3 * H)))
      .set(auth(prof.token));
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).not.toHaveProperty('solicitanteEmail');
    expect(JSON.stringify(res.body)).not.toContain('@teste.local');
  });
});

describe('GET /api/reservas/pendentes', () => {
  it('traz pendente daqui a 3 meses e não traz expirada', async () => {
    const admin = await criarUsuarioTeste('admin');
    const prof = await criarUsuarioTeste('usuario');
    const sala = await criarSalaTeste();
    const futura = await inserir(sala.id, prof.perfil.id, new Date(Date.now() + 90 * 24 * H), 1, 'pendente');
    await inserir(sala.id, prof.perfil.id, new Date(Date.now() - 2 * 24 * H), 1, 'pendente');
    const res = await request(app()).get('/api/reservas/pendentes').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([futura]);
  });
  it('professor → 403', async () => {
    const prof = await criarUsuarioTeste('usuario');
    const res = await request(app()).get('/api/reservas/pendentes').set(auth(prof.token));
    expect(res.status).toBe(403);
  });
});
