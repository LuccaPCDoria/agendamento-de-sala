// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from './Layout';

const apiMock = vi.hoisted(() => vi.fn());
const papel = vi.hoisted(() => ({ valor: 'admin' }));
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    perfil: { id: 'u1', nome: 'Ana', email: 'a@x', papel: papel.valor, ativo: true },
    sair: vi.fn(),
    expirarSessao: vi.fn(),
  }),
}));

beforeEach(() => {
  apiMock.mockReset();
  apiMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  papel.valor = 'admin';
  window.matchMedia = undefined as never;
});
afterEach(cleanup);

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('Layout', () => {
  it('professor não renderiza contador e não chama /reservas/pendentes', async () => {
    papel.valor = 'usuario';
    montar();
    await new Promise((r) => setTimeout(r, 50));
    expect(apiMock.mock.calls.some((c) => c[0] === '/reservas/pendentes')).toBe(false);
  });

  it('admin chama /reservas/pendentes e vê o contador ao lado de Aprovações', async () => {
    montar();
    const link = screen.getByRole('link', { name: /Aprovações/ });
    await waitFor(() => expect(link).toHaveTextContent('2'));
    expect(apiMock.mock.calls.some((c) => c[0] === '/reservas/pendentes')).toBe(true);
  });

  it('há uma única nav "Menu principal"', () => {
    montar();
    expect(screen.getAllByRole('navigation', { name: 'Menu principal' })).toHaveLength(1);
  });

  it('menu móvel: botão alterna e Esc e backdrop fecham', async () => {
    montar();
    expect(screen.queryByTestId('backdrop-menu')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const fechar = screen.getByRole('button', { name: 'Fechar menu' });
    expect(fechar).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('backdrop-menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    await userEvent.click(screen.getByTestId('backdrop-menu'));
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('backdrop-menu')).not.toBeInTheDocument();
  });

  it('há dois BotaoTema sincronizados', async () => {
    montar();
    const botoes = screen.getAllByRole('button', { name: /Ativar modo/ });
    expect(botoes).toHaveLength(2);
    await userEvent.click(botoes[0]);
    expect(screen.getAllByRole('button', { name: 'Ativar modo claro' })).toHaveLength(2);
  });
});
