// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Reservas from './Reservas';

const apiMock = vi.hoisted(() => vi.fn());
const papel = vi.hoisted(() => ({ valor: 'admin' }));
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ perfil: { id: 'u1', nome: 'Ana', email: 'a@x', papel: papel.valor, ativo: true } }),
}));

beforeEach(() => {
  apiMock.mockReset();
  apiMock.mockResolvedValue([]);
});
afterEach(cleanup);

const montar = () => render(
  <QueryClientProvider client={new QueryClient()}><Reservas /></QueryClientProvider>,
);
const ultima = () => apiMock.mock.calls.filter((c) => c[0] === '/reservas').at(-1)?.[1]?.query;

describe('Reservas', () => {
  it('admin abre com todas as reservas e os cinco status; alternar para Minhas envia minhas', async () => {
    papel.valor = 'admin';
    const user = userEvent.setup();
    montar();
    await waitFor(() => expect(ultima()).toBeDefined());
    expect(ultima().minhas).toBeUndefined();
    expect(ultima().status).toBe('pendente,expirada,aprovada,recusada,cancelada');
    await user.click(screen.getByRole('checkbox', { name: 'Recusada' }));
    await waitFor(() => expect(ultima().status).toBe('pendente,expirada,aprovada,cancelada'));
    await user.click(screen.getByRole('button', { name: 'Minhas' }));
    await waitFor(() => expect(ultima().minhas).toBe('true'));
  });

  it('professor só vê as próprias e sem filtro de status', async () => {
    papel.valor = 'usuario';
    montar();
    await waitFor(() => expect(ultima()).toBeDefined());
    expect(ultima().minhas).toBe('true');
    expect(ultima().status).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Todas as reservas' })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Recusada' })).toBeNull();
  });
});
