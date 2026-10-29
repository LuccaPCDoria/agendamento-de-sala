// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Inbox } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReservaDTO } from '../../shared/tipos';
import ListaReservas from './ListaReservas';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ perfil: { id: 'u9', nome: 'Admin', email: 'a@x', papel: 'admin', ativo: true } }),
}));
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: vi.fn().mockResolvedValue([]) };
});
afterEach(cleanup);

const base: ReservaDTO = {
  id: 'r1', salaId: 's1', salaNome: 'Sala A', salaTipo: 'reuniao', usuarioId: 'u1',
  solicitanteNome: 'Ana Souza', inicio: new Date(2099, 10, 3, 9, 0).toISOString(),
  fim: new Date(2099, 10, 3, 10, 0).toISOString(), status: 'pendente', finalidade: 'Reunião de equipe',
  motivoRecusa: null, expirada: false,
};
const vazio = { icone: Inbox, mensagem: 'Nenhuma solicitação pendente' };
const montar = (reservas: ReservaDTO[]) => render(
  <QueryClientProvider client={new QueryClient()}><ListaReservas reservas={reservas} vazio={vazio} /></QueryClientProvider>,
);

describe('ListaReservas', () => {
  it('linha mostra sala, finalidade, solicitante, horário e selo', () => {
    montar([base]);
    expect(screen.getByText('Sala A')).toBeInTheDocument();
    expect(screen.getByText('Reunião de equipe')).toBeInTheDocument();
    expect(screen.getByText(/Ana Souza/)).toBeInTheDocument();
    expect(screen.getByText(/09:00–10:00/)).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('recusada mostra "Motivo: …" na linha', () => {
    montar([{ ...base, status: 'recusada', motivoRecusa: 'Sala em manutenção' }]);
    expect(screen.getByText('Motivo: Sala em manutenção')).toBeInTheDocument();
  });

  it('finalidade de 200 caracteres é truncada e a linha tem min-w-0', () => {
    const longa = 'x'.repeat(200);
    montar([{ ...base, finalidade: longa }]);
    const el = screen.getByText(longa);
    expect(el.className).toMatch(/truncate|line-clamp-2/);
    expect(el.parentElement!.className).toContain('min-w-0');
  });

  it('lista vazia mostra a mensagem recebida em vazio', () => {
    montar([]);
    expect(screen.getByText('Nenhuma solicitação pendente')).toBeInTheDocument();
  });
});
