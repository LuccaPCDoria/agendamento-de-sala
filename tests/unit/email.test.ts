import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { escaparHtml, montarEmail, criarNotificador } from '../../server/lib/email';
import type { EventoEmail, TipoEmail } from '../../server/lib/notificador';
import type { ReservaDetalhada } from '../../server/tipos';

const URL = 'https://app.exemplo.com';
const r = {
  id: 'r1', salaId: 's1', salaNome: 'Sala 1', salaTipo: 'sala', usuarioId: 'u1',
  solicitanteNome: 'Ana', solicitanteEmail: 'ana@x.com',
  inicio: new Date('2026-11-04T13:00:00Z'), fim: new Date('2026-11-04T14:30:00Z'),
  status: 'pendente', finalidade: 'Aula', motivoRecusa: null,
  criadoEm: new Date(), atualizadoEm: new Date(),
} as unknown as ReservaDetalhada;
const evento: EventoEmail = { para: 'ana@x.com', nome: 'Ana', tipo: 'confirmada', reservas: [r] };
const eventoComInicio = (iso: string): EventoEmail => ({ ...evento, reservas: [{ ...r, inicio: new Date(iso) }] });

describe('montarEmail', () => {
  it('escapa HTML', () => {
    expect(escaparHtml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&#39;');
    const { html } = montarEmail({ ...evento, tipo: 'recusada', nome: '<b>N</b>', reservas: [{ ...r, salaNome: '<i>S</i>', finalidade: '<script>x</script>', motivoRecusa: 'a & b' }] }, URL);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>N');
    expect(html).not.toContain('<i>S');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b');
  });
  it('horário em Brasília', () => {
    const { texto } = montarEmail(eventoComInicio('2026-11-04T01:00:00Z'), URL);
    expect(texto).toContain('03/11/2026');
    expect(texto).toContain('22:00–');
  });
  it('conteúdo: saudação, sala, finalidade, motivo e link', () => {
    const { texto } = montarEmail({ ...evento, tipo: 'recusada', reservas: [{ ...r, motivoRecusa: 'Sem vaga' }] }, URL);
    expect(texto).toContain('Ana');
    expect(texto).toContain('Sala 1');
    expect(texto).toContain('10:00–11:30');
    expect(texto).toContain('Aula');
    expect(texto).toContain('Sem vaga');
    expect(texto).toContain(URL);
  });
  it('assunto por tipo', () => {
    const esperado: Record<TipoEmail, string> = {
      confirmada: 'Reserva confirmada',
      aprovada: 'Reserva aprovada', recusada: 'Reserva recusada', cancelada: 'Reserva cancelada',
    };
    for (const [tipo, assunto] of Object.entries(esperado))
      expect(montarEmail({ ...evento, tipo: tipo as TipoEmail }, URL).assunto).toBe(assunto);
  });
});

describe('criarNotificador', () => {
  const send = vi.fn();
  const close = vi.fn();
  const criar = (prazoMs?: number) =>
    criarNotificador({ usuario: 'g@x.com', senha: 'segredo', appUrl: URL, prazoMs, criarTransporte: () => ({ sendMail: send, close }) as never });
  beforeEach(() => { send.mockReset().mockResolvedValue({}); close.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('um sendMail por evento e fecha o transporte', async () => {
    await criar()([evento, { ...evento, para: 'b@x.com' }]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toMatchObject({ from: 'g@x.com', to: 'ana@x.com', subject: 'Reserva confirmada' });
    expect(close).toHaveBeenCalledOnce();
  });
  it('eventos vazios não criam transporte', async () => {
    const criarTransporte = vi.fn();
    await criarNotificador({ usuario: 'a', senha: 'b', appUrl: URL, criarTransporte })([]);
    expect(criarTransporte).not.toHaveBeenCalled();
  });
  it('não rejeita quando o envio falha', async () => {
    send.mockRejectedValue(new Error('smtp'));
    await expect(criar()([evento])).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });
  it('respeita o prazo', async () => {
    vi.useFakeTimers();
    send.mockReturnValue(new Promise(() => {}));
    const p = criar()([evento]);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(p).resolves.toBeUndefined();
    expect(close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
