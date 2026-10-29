// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ perfil: null, carregando: false, entrar: vi.fn() }),
}));

import Login from './Login';

afterEach(cleanup);

function renderizar(url = '/login') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login', () => {
  it('mostra a frase do painel e os campos com os mesmos rótulos', () => {
    renderizar();
    expect(screen.getByText('Reserve a sala certa, sem conflito.')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar' }).getAttribute('type')).toBe('submit');
  });

  it('mostra a mensagem de sessão expirada com ?expirada=1', () => {
    renderizar('/login?expirada=1');
    expect(screen.getByText('Sessão expirada. Entre novamente.')).toBeTruthy();
  });

  it('não tem botão de tema', () => {
    renderizar();
    expect(screen.queryByRole('button', { name: /Ativar modo/ })).toBeNull();
  });
});
