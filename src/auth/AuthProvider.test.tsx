// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, signOut, signInWithPassword, onAuthStateChange, api } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  signInWithPassword: vi.fn(),
  onAuthStateChange: vi.fn(),
  api: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession, signOut, signInWithPassword, onAuthStateChange } },
}));
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api };
});

import { ErroApi } from '../lib/api';
import { AuthProvider, useAuth } from './AuthProvider';

function Sonda() {
  const { carregando, erroCarga, perfil } = useAuth();
  return <div>{carregando ? 'carregando' : erroCarga ? `erro:${erroCarga}` : perfil ? 'logado' : 'anonimo'}</div>;
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ data: { session: { access_token: 'T' } } });
  signOut.mockResolvedValue({});
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

const montar = () => render(<AuthProvider><Sonda /></AuthProvider>);

describe('AuthProvider ao restaurar a sessão', () => {
  it('encerra a sessão local quando /me responde 403', async () => {
    api.mockRejectedValue(new ErroApi(403, 'Usuário inativo'));
    montar();
    await screen.findByText('anonimo');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('mantém a sessão e expõe erro quando /me responde 500', async () => {
    api.mockRejectedValue(new ErroApi(500, 'Erro'));
    montar();
    await screen.findByText(/^erro:/);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('mantém a sessão em erro de rede', async () => {
    api.mockRejectedValue(new TypeError('Failed to fetch'));
    montar();
    await screen.findByText(/^erro:/);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('não deixa carregando travado se getSession rejeitar', async () => {
    getSession.mockRejectedValue(new TypeError('x'));
    montar();
    await screen.findByText(/^erro:/);
  });
});
