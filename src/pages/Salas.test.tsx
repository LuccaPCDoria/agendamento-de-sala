// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.queryByRole('textbox', { name: 'Buscar' })).toBeNull();
  });
});

describe('Salas filtros', () => {
  it('busca reduz a lista, mostra o contador e limpar restaura', async () => {
    apiMock.mockResolvedValue(salas);
    const user = userEvent.setup();
    montar();
    await screen.findByText('Sala 1');
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();

    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'projetor');
    expect(screen.queryByText('Sala 2')).toBeNull();
    expect(screen.getByText('Sala 1')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('Sala 2')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Buscar' })).toHaveValue('');
  });

  it('filtra por situação e capacidade mínima', async () => {
    apiMock.mockResolvedValue(salas);
    const user = userEvent.setup();
    montar();
    await screen.findByText('Sala 1');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'inativo');
    expect(screen.queryByText('Sala 1')).toBeNull();
    expect(screen.getByText('Sala 2')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), '');
    await user.type(screen.getByRole('spinbutton', { name: 'Capacidade mínima' }), '20');
    expect(screen.getByText('Sala 1')).toBeInTheDocument();
    expect(screen.queryByText('Sala 2')).toBeNull();
  });

  it('sem resultado mostra mensagem própria com opção de limpar', async () => {
    apiMock.mockResolvedValue(salas);
    const user = userEvent.setup();
    montar();
    await screen.findByText('Sala 1');
    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'inexistente');
    expect(screen.getByText('Nenhum resultado para os filtros')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma sala cadastrada')).toBeNull();
  });
});
