// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { auth: { getSession } } }));

import { api } from './api';

const fetchMock = vi.fn();

beforeEach(() => {
  getSession.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
});

describe('api', () => {
  it('usa o token da sessão atual em cada chamada', async () => {
    getSession
      .mockResolvedValueOnce({ data: { session: { access_token: 'A' } } })
      .mockResolvedValueOnce({ data: { session: { access_token: 'B' } } });
    await api('/me');
    await api('/me');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer A');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer B');
  });

  it('lança ErroApi com a mensagem do servidor', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'A' } } });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ erro: 'Esta sala já está reservada nesse horário.' }), { status: 409 }),
    );
    await expect(api('/reservas', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({
      status: 409,
      message: 'Esta sala já está reservada nesse horário.',
    });
  });

  it('prefixa /api e monta a query ignorando valores indefinidos', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await api('/reservas', { query: { a: '1', b: undefined } });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/reservas?a=1');
  });
});
