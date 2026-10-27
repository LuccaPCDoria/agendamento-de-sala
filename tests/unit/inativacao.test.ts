import { describe, expect, it, vi } from 'vitest';
import { criarServicoSalas } from '../../server/services/salas';
import { criarServicoUsuarios } from '../../server/services/usuarios';
import { depsFalsas } from './fakes';
import { ErroApp } from '../../server/lib/erros';
import type { Perfil, Sala } from '../../shared/tipos';
import type { ReservaDetalhada } from '../../server/tipos';

const ID = '11111111-1111-4111-8111-111111111111';
const admin: Perfil = { id: 'adm', nome: 'Adm', email: 'adm@x.com', papel: 'admin', ativo: true };
const sala: Sala = { id: ID, nome: 'S', tipo: 'reuniao', capacidade: 5, recursos: [], ativa: false };
const perfil: Perfil = { id: ID, nome: 'P', email: 'p@x.com', papel: 'usuario', ativo: false };

const det = (id: string, usuarioId: string): ReservaDetalhada =>
  ({ id, usuarioId, solicitanteEmail: `${usuarioId}@x.com`, solicitanteNome: usuarioId }) as unknown as ReservaDetalhada;

const ordemDe = (...fns: unknown[]) =>
  fns.map((f) => (f as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]);

describe('inativação de salas', () => {
  it('ordem definirAtiva → cancelar → histórico → buscarDetalhadas', async () => {
    const deps = depsFalsas();
    const r = deps.repos;
    vi.mocked(r.salas.definirAtiva).mockResolvedValue(sala);
    vi.mocked(r.reservas.cancelarFuturasDaSala).mockResolvedValue([{ id: 'r1', anterior: 'pendente' }]);
    vi.mocked(r.reservas.buscarDetalhadas).mockResolvedValue([det('r1', 'u1')]);
    const res = await criarServicoSalas(deps).inativar(admin, ID);
    const ordem = ordemDe(
      r.salas.definirAtiva, r.reservas.cancelarFuturasDaSala, r.historico.registrar, r.reservas.buscarDetalhadas,
    );
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
    expect(r.historico.registrar).toHaveBeenCalledWith([
      { reservaId: 'r1', anterior: 'pendente', novo: 'cancelada', alteradoPor: 'adm' },
    ]);
    expect(res).toBe(sala);
  });
  it('um e-mail por solicitante com todas as reservas dele', async () => {
    const deps = depsFalsas();
    const r = deps.repos;
    vi.mocked(r.salas.definirAtiva).mockResolvedValue(sala);
    vi.mocked(r.reservas.cancelarFuturasDaSala).mockResolvedValue([
      { id: 'r1', anterior: 'pendente' }, { id: 'r2', anterior: 'aprovada' }, { id: 'r3', anterior: 'aprovada' },
    ]);
    vi.mocked(r.reservas.buscarDetalhadas).mockResolvedValue([det('r1', 'u1'), det('r2', 'u2'), det('r3', 'u1')]);
    await criarServicoSalas(deps).inativar(admin, ID);
    const eventos = vi.mocked(deps.notificar).mock.calls[0][0];
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toMatchObject({ tipo: 'cancelada' });
    expect(eventos[0].reservas).toHaveLength(2);
  });
  it('sala inexistente → 404 e nada é cancelado', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.salas.definirAtiva).mockResolvedValue(null);
    await expect(criarServicoSalas(deps).inativar(admin, ID)).rejects.toMatchObject({ status: 404, message: 'Sala não encontrada.' });
    expect(deps.repos.reservas.cancelarFuturasDaSala).not.toHaveBeenCalled();
  });
  it('nada cancelado → lista vazia de eventos', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.salas.definirAtiva).mockResolvedValue(sala);
    vi.mocked(deps.repos.reservas.cancelarFuturasDaSala).mockResolvedValue([]);
    vi.mocked(deps.repos.reservas.buscarDetalhadas).mockResolvedValue([]);
    await criarServicoSalas(deps).inativar(admin, ID);
    expect(deps.notificar).toHaveBeenCalledWith([]);
  });
  it('reativar só ativa a sala', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.salas.definirAtiva).mockResolvedValue({ ...sala, ativa: true });
    const r = await criarServicoSalas(deps).reativar(ID);
    expect(deps.repos.salas.definirAtiva).toHaveBeenCalledWith(ID, true);
    expect(deps.repos.reservas.cancelarFuturasDaSala).not.toHaveBeenCalled();
    expect(r.ativa).toBe(true);
  });
  it('reativar sala inexistente → 404', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.salas.definirAtiva).mockResolvedValue(null);
    await expect(criarServicoSalas(deps).reativar(ID)).rejects.toMatchObject({ status: 404 });
  });
});

describe('inativação de usuários', () => {
  it('admin não inativa a si mesmo', async () => {
    const deps = depsFalsas();
    await expect(criarServicoUsuarios(deps).inativar(admin, 'adm')).rejects.toMatchObject({
      status: 400, message: 'Você não pode inativar a sua própria conta.',
    });
    expect(deps.repos.perfis.definirAtivo).not.toHaveBeenCalled();
  });
  it('ordem definirAtivo → cancelar → histórico → buscarDetalhadas → bloqueio', async () => {
    const deps = depsFalsas();
    const r = deps.repos;
    vi.mocked(r.perfis.definirAtivo).mockResolvedValue(perfil);
    vi.mocked(r.reservas.cancelarFuturasDoUsuario).mockResolvedValue([{ id: 'r1', anterior: 'aprovada' }]);
    vi.mocked(r.reservas.buscarDetalhadas).mockResolvedValue([det('r1', ID)]);
    const res = await criarServicoUsuarios(deps).inativar(admin, ID);
    const ordem = ordemDe(
      r.perfis.definirAtivo, r.reservas.cancelarFuturasDoUsuario, r.historico.registrar,
      r.reservas.buscarDetalhadas, deps.authAdmin.definirBloqueio,
    );
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
    expect(deps.authAdmin.definirBloqueio).toHaveBeenCalledWith(ID, true);
    expect(deps.notificar).toHaveBeenCalledTimes(1);
    expect(res).toBe(perfil);
  });
  it('usuário inexistente → 404', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.definirAtivo).mockResolvedValue(null);
    await expect(criarServicoUsuarios(deps).inativar(admin, ID)).rejects.toMatchObject({
      status: 404, message: 'Usuário não encontrado.',
    });
  });
  it('falha no ban do Auth propaga (rollback) e não notifica', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.definirAtivo).mockResolvedValue(perfil);
    vi.mocked(deps.repos.reservas.cancelarFuturasDoUsuario).mockResolvedValue([]);
    vi.mocked(deps.repos.reservas.buscarDetalhadas).mockResolvedValue([]);
    vi.mocked(deps.authAdmin.definirBloqueio).mockRejectedValue(new ErroApp(502, 'falha'));
    await expect(criarServicoUsuarios(deps).inativar(admin, ID)).rejects.toMatchObject({ status: 502 });
    expect(deps.notificar).not.toHaveBeenCalled();
  });
  it('reativar: ativa o perfil e desbloqueia no Auth', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.definirAtivo).mockResolvedValue({ ...perfil, ativo: true });
    const r = await criarServicoUsuarios(deps).reativar(ID);
    expect(deps.repos.perfis.definirAtivo).toHaveBeenCalledWith(ID, true);
    expect(deps.authAdmin.definirBloqueio).toHaveBeenCalledWith(ID, false);
    expect(r.ativo).toBe(true);
  });
  it('reativar inexistente → 404 sem tocar no Auth', async () => {
    const deps = depsFalsas();
    vi.mocked(deps.repos.perfis.definirAtivo).mockResolvedValue(null);
    await expect(criarServicoUsuarios(deps).reativar(ID)).rejects.toMatchObject({ status: 404 });
    expect(deps.authAdmin.definirBloqueio).not.toHaveBeenCalled();
  });
});
