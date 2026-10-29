// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Usuarios from './Usuarios';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});

const usuarios = [
  { id: 'u1', nome: 'Natália Pereira', email: 'natalia@escola.com', papel: 'usuario', ativo: true },
  { id: 'u2', nome: 'Coordenação Geral', email: 'direcao@escola.com', papel: 'admin', ativo: true },
  { id: 'u3', nome: 'Tiago Monteiro', email: 'tiago@escola.com', papel: 'usuario', ativo: false },
];

beforeEach(() => { apiMock.mockReset(); });
afterEach(cleanup);

const montar = () => render(
  <QueryClientProvider client={new QueryClient()}><Usuarios /></QueryClientProvider>,
);

describe('Usuarios filtros', () => {
  it('busca por nome sem acento e mostra o contador', async () => {
    apiMock.mockResolvedValue(usuarios);
    const user = userEvent.setup();
    montar();
    await screen.findByText('Natália Pereira');
    expect(screen.getByText('3 de 3')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'natalia');
    expect(screen.getByText('Natália Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Coordenação Geral')).toBeNull();
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
  });

  it('filtra por perfil e situação; limpar restaura', async () => {
    apiMock.mockResolvedValue(usuarios);
    const user = userEvent.setup();
    montar();
    await screen.findByText('Natália Pereira');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'admin');
    expect(screen.getByText('Coordenação Geral')).toBeInTheDocument();
    expect(screen.queryByText('Natália Pereira')).toBeNull();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'inativo');
    expect(screen.getByText('Tiago Monteiro')).toBeInTheDocument();
    expect(screen.queryByText('Coordenação Geral')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('3 de 3')).toBeInTheDocument();
  });
});
