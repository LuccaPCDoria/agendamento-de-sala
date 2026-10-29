// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Ouvinte = (e: { matches: boolean }) => void;

function instalarMatchMedia(escuro: boolean) {
  const ouvintes = new Set<Ouvinte>();
  const mq = {
    matches: escuro,
    addEventListener: (_: string, cb: Ouvinte) => ouvintes.add(cb),
    removeEventListener: (_: string, cb: Ouvinte) => ouvintes.delete(cb),
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mq),
  });
  return {
    disparar(novo: boolean) {
      mq.matches = novo;
      ouvintes.forEach((cb) => cb({ matches: novo }));
    },
  };
}

async function carregar() {
  vi.resetModules();
  return import('./tema');
}

const escuroAplicado = () => document.documentElement.classList.contains('dark');

beforeEach(() => {
  document.documentElement.className = '';
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('resolverTema', () => {
  it('salvo vence o sistema', async () => {
    const { resolverTema } = await carregar();
    expect(resolverTema('claro', true)).toBe('claro');
    expect(resolverTema('escuro', false)).toBe('escuro');
  });
  it('sem salvo segue o sistema', async () => {
    const { resolverTema } = await carregar();
    expect(resolverTema(null, true)).toBe('escuro');
    expect(resolverTema('lixo', false)).toBe('claro');
  });
});

describe('store de tema', () => {
  it('iniciarTema aplica a classe dark quando o sistema é escuro', async () => {
    instalarMatchMedia(true);
    const m = await carregar();
    m.iniciarTema();
    expect(escuroAplicado()).toBe(true);
    expect(m.obterTema()).toBe('escuro');
  });

  it('alternar troca, persiste e notifica assinantes', async () => {
    instalarMatchMedia(false);
    const m = await carregar();
    m.iniciarTema();
    const cb = vi.fn();
    m.assinar(cb);
    m.alternar();
    expect(escuroAplicado()).toBe(true);
    expect(localStorage.getItem(m.CHAVE_TEMA)).toBe('escuro');
    expect(cb).toHaveBeenCalledTimes(1);
    m.alternar();
    expect(escuroAplicado()).toBe(false);
    expect(localStorage.getItem('agendamento:tema')).toBe('claro');
  });

  it('assinar devolve função que cancela', async () => {
    instalarMatchMedia(false);
    const m = await carregar();
    m.iniciarTema();
    const cb = vi.fn();
    m.assinar(cb)();
    m.alternar();
    expect(cb).not.toHaveBeenCalled();
  });

  it('sem preferência salva acompanha a mudança do sistema', async () => {
    const mq = instalarMatchMedia(false);
    const m = await carregar();
    m.iniciarTema();
    mq.disparar(true);
    expect(escuroAplicado()).toBe(true);
    mq.disparar(false);
    expect(escuroAplicado()).toBe(false);
  });

  it('com preferência salva ignora a mudança do sistema', async () => {
    localStorage.setItem('agendamento:tema', 'claro');
    const mq = instalarMatchMedia(false);
    const m = await carregar();
    m.iniciarTema();
    mq.disparar(true);
    expect(escuroAplicado()).toBe(false);
  });

  it('após alternar, ignora o sistema', async () => {
    const mq = instalarMatchMedia(false);
    const m = await carregar();
    m.iniciarTema();
    m.alternar();
    mq.disparar(false);
    expect(escuroAplicado()).toBe(true);
  });

  it('iniciarTema é idempotente (um único listener)', async () => {
    const mq = instalarMatchMedia(false);
    const m = await carregar();
    m.iniciarTema();
    m.iniciarTema();
    expect(window.matchMedia).toHaveBeenCalledTimes(1);
    const cb = vi.fn();
    m.assinar(cb);
    mq.disparar(true);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('localStorage lançando erro: segue o sistema e alternar não quebra', async () => {
    const mq = instalarMatchMedia(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const m = await carregar();
    m.iniciarTema();
    expect(escuroAplicado()).toBe(true);
    expect(() => m.alternar()).not.toThrow();
    expect(escuroAplicado()).toBe(false);
    mq.disparar(true); // passou a ignorar o sistema
    expect(escuroAplicado()).toBe(false);
  });

  it('sem matchMedia (undefined) assume claro', async () => {
    const m = await carregar();
    expect(() => m.iniciarTema()).not.toThrow();
    expect(escuroAplicado()).toBe(false);
    expect(m.obterTema()).toBe('claro');
  });

  it('obterTema antes de iniciarTema lê a classe do html', async () => {
    document.documentElement.classList.add('dark');
    const m = await carregar();
    expect(m.obterTema()).toBe('escuro');
  });
});
