// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Calendario from './Calendario';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ perfil: { id: 'u1', nome: 'Ana', email: 'a@x', papel: 'usuario', ativo: true } }),
}));

beforeEach(() => {
  apiMock.mockReset();
  apiMock.mockImplementation((caminho: string) => Promise.resolve(caminho === '/salas' ? [] : []));
});
afterEach(cleanup);

describe('Calendario', () => {
  it('re-renderizar (abrir/fechar modal) não rebusca as reservas', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Calendario />
      </QueryClientProvider>,
    );
    const reservas = () => apiMock.mock.calls.filter((c) => c[0] === '/reservas').length;
    await waitFor(() => expect(reservas()).toBe(1));
    await user.click(screen.getByRole('button', { name: 'Nova reserva' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await new Promise((r) => setTimeout(r, 200));
    // fechar() faz um refetch explícito; abrir o modal não pode ter feito nenhum
    expect(reservas()).toBe(2);
  });
});
