// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Salas from './Salas';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});

const salas = [
  { id: 's1', nome: 'Sala 1', tipo: 'sala_aula', capacidade: 30, recursos: ['Projetor', 'Ar'], ativa: true },
  { id: 's2', nome: 'Sala 2', tipo: 'sala_aula', capacidade: 10, recursos: [], ativa: false },
];

beforeEach(() => { apiMock.mockReset(); });
afterEach(cleanup);

const montar = () => render(
  <QueryClientProvider client={new QueryClient()}><Salas /></QueryClientProvider>,
);

describe('Salas visual', () => {
  it('aplica selos, chips e botão Inativar com contorno', async () => {
    apiMock.mockResolvedValue(salas);
    montar();
    expect(await screen.findByText('Ativa')).toHaveClass('bg-primaria-suave');
    expect(screen.getByText('Inativa')).toHaveClass('bg-neutro-suave');
    expect(screen.getByText('Projetor')).toHaveClass('bg-superficie-2');
    expect(screen.getByText('Ar')).toHaveClass('bg-superficie-2');
    expect(screen.getByRole('button', { name: 'Inativar' })).toHaveClass('border-erro', 'text-erro');
  });

  it('mostra estado vazio', async () => {
    apiMock.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Nenhuma sala cadastrada')).toBeInTheDocument();
  });
});
