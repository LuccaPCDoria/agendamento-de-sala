// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContadorPendentes from './ContadorPendentes';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', async () => {
  const real = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return { ...real, api: apiMock };
});

beforeEach(() => apiMock.mockReset());
afterEach(cleanup);

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ContadorPendentes />
    </QueryClientProvider>,
  );

describe('ContadorPendentes', () => {
  it('mostra o número de pendentes', async () => {
    apiMock.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    montar();
    expect(await screen.findByText('3')).toBeInTheDocument();
  });
  it('não usa aria-label e expõe "N pendentes" só para leitores de tela', async () => {
    apiMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const { container } = montar();
    const sr = await screen.findByText('2 pendentes');
    expect(sr).toHaveClass('sr-only');
    expect(container.querySelector('[aria-label]')).toBeNull();
  });
  it('fica oculto com zero', async () => {
    apiMock.mockResolvedValue([]);
    const { container } = montar();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
