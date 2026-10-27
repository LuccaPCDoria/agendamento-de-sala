// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil, ReservaDTO } from '../../shared/tipos';
import ModalDetalhes from './ModalDetalhes';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});

const reserva: ReservaDTO = {
  id: 'r1', salaId: 's1', salaNome: 'Sala A', salaTipo: 'reuniao', usuarioId: 'u1',
  solicitanteNome: 'Ana', inicio: new Date(2026, 10, 3, 9, 0).toISOString(),
  fim: new Date(2026, 10, 3, 10, 0).toISOString(), status: 'pendente', finalidade: 'Reunião',
  motivoRecusa: null, expirada: false,
};
const dono = { id: 'u1', nome: 'Ana', email: 'a@x', papel: 'usuario', ativo: true } as Perfil;
const outro = { ...dono, id: 'u2' } as Perfil;
const admin = { ...dono, id: 'u3', papel: 'admin' } as Perfil;

function montar(r: ReservaDTO, perfil: Perfil) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ModalDetalhes reserva={r} perfil={perfil} aoFechar={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => { apiMock.mockReset(); });
afterEach(cleanup);

describe('ModalDetalhes', () => {
  it('professor vendo reserva alheia não tem botões de ação', () => {
    montar(reserva, outro);
    expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recusar' })).toBeNull();
  });

  it('dono vê Cancelar; admin vê Aprovar e Recusar em pendente', () => {
    montar(reserva, dono);
    expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
    cleanup();
    montar(reserva, admin);
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument();
  });

  it('expirada mostra "Expirada" e nenhum botão de aprovar', () => {
    montar({ ...reserva, expirada: true }, admin);
    expect(screen.getByText('Expirada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
  });

  it('Recusar sem motivo não envia', async () => {
    const user = userEvent.setup();
    montar(reserva, admin);
    await user.click(screen.getByRole('button', { name: 'Recusar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar recusa' }));
    expect(apiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o motivo da recusa.')).toBeInTheDocument();
  });
});
