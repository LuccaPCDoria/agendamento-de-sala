// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Aprovacoes from './Aprovacoes';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ perfil: { id: 'adm', nome: 'Direção', email: 'd@x', papel: 'admin', ativo: true } }),
}));

const pendente = (id: string, extra: object) => ({
  id, salaId: 's1', salaNome: 'Sala 1', salaTipo: 'reuniao', usuarioId: 'u', solicitanteNome: 'Fulano',
  inicio: '2026-11-10T13:00:00.000Z', fim: '2026-11-10T14:00:00.000Z', status: 'pendente',
  finalidade: 'Reunião', motivoRecusa: null, expirada: false, ...extra,
});
const pendentes = [
  pendente('r1', { solicitanteNome: 'Ana Souza', finalidade: 'Clube de leitura', salaId: 's2', salaNome: 'Biblioteca Central', salaTipo: 'biblioteca' }),
  pendente('r2', { solicitanteNome: 'Bruno Oliveira', finalidade: 'Aula de química', salaId: 's3', salaNome: 'Laboratório',
    salaTipo: 'laboratorio', inicio: '2026-11-20T13:00:00.000Z', fim: '2026-11-20T14:00:00.000Z' }),
];
const salas = [
  { id: 's2', nome: 'Biblioteca Central', tipo: 'biblioteca', capacidade: 30, recursos: [], ativa: true },
  { id: 's3', nome: 'Laboratório', tipo: 'laboratorio', capacidade: 20, recursos: [], ativa: true },
];

beforeEach(() => {
  apiMock.mockReset();
  apiMock.mockImplementation(async (c: string) => (c === '/salas' ? salas : pendentes));
});
afterEach(cleanup);

const montar = () => render(
  <QueryClientProvider client={new QueryClient()}><Aprovacoes /></QueryClientProvider>,
);

describe('Aprovacoes filtros', () => {
  it('busca por solicitante e finalidade', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Clube de leitura');
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'quimica');
    expect(screen.queryByText('Clube de leitura')).toBeNull();
    expect(screen.getByText('Aula de química')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('filtra por sala, tipo e período', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Clube de leitura');
    await screen.findByRole('option', { name: 'Biblioteca Central' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sala' }), 's2');
    expect(screen.queryByText('Aula de química')).toBeNull();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sala' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'laboratorio');
    expect(screen.queryByText('Clube de leitura')).toBeNull();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), '');
    await user.type(screen.getByLabelText('De'), '2026-11-15');
    expect(screen.queryByText('Clube de leitura')).toBeNull();
    expect(screen.getByText('Aula de química')).toBeInTheDocument();
  });

  it('sem resultado mostra mensagem própria e limpar restaura', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('Clube de leitura');
    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'zzz');
    expect(screen.getByText('Nenhum resultado para os filtros')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma solicitação pendente')).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
    expect(screen.getByText('Clube de leitura')).toBeInTheDocument();
  });
});
