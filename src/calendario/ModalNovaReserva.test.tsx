// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sala } from '../../shared/tipos';
import ModalNovaReserva from './ModalNovaReserva';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});
import { ErroApi } from '../lib/api';

const SALA_ID = '11111111-1111-4111-8111-111111111111';
const salas: Sala[] = [
  { id: SALA_ID, nome: 'Sala A', tipo: 'reuniao', capacidade: 5, recursos: [], ativa: true },
];
const inicio = new Date(2026, 10, 3, 9, 0);
const fim = new Date(2026, 10, 3, 10, 0);

function montar(inicial: { salaId?: string } = {}, aoFechar = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ModalNovaReserva aberto inicial={{ inicio, fim, ...inicial }} salas={salas} aoFechar={aoFechar} />
    </QueryClientProvider>,
  );
  return aoFechar;
}

beforeEach(() => { apiMock.mockReset(); });
afterEach(cleanup);

describe('ModalNovaReserva', () => {
  it('duplo clique em Confirmar envia uma única requisição', async () => {
    apiMock.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    montar({ salaId: SALA_ID });
    await user.type(screen.getByLabelText('Finalidade'), 'Reunião de equipe');
    await user.dblClick(screen.getByRole('button', { name: 'Confirmar' }));
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Confirmar|Enviando/ })).toBeDisabled();
  });

  it('envia ISO e fecha em caso de sucesso', async () => {
    apiMock.mockResolvedValue({});
    const user = userEvent.setup();
    const aoFechar = montar({ salaId: SALA_ID });
    await user.type(screen.getByLabelText('Finalidade'), 'Reunião');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(apiMock.mock.calls[0][1].corpo).toEqual({
      salaId: SALA_ID, inicio: inicio.toISOString(), fim: fim.toISOString(), finalidade: 'Reunião',
    });
  });

  it('409 mantém o modal aberto com a mensagem', async () => {
    apiMock.mockRejectedValue(new ErroApi(409, 'Horário indisponível.'));
    const user = userEvent.setup();
    const aoFechar = montar({ salaId: SALA_ID });
    await user.type(screen.getByLabelText('Finalidade'), 'Reunião');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Horário indisponível.')).toBeTruthy();
    expect(aoFechar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('com salaId preenchido não mostra o seletor de sala', () => {
    montar({ salaId: SALA_ID });
    expect(screen.queryByLabelText('Sala')).toBeNull();
  });

  it('sem salaId mostra o seletor de sala', () => {
    montar();
    expect(screen.getByLabelText('Sala')).toBeTruthy();
  });
});
