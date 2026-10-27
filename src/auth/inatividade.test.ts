import { describe, expect, it } from 'vitest';
import { LIMITE_INATIVIDADE_MS, registrarAtividade, sessaoExpirada } from './inatividade';

function criarStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe('inatividade', () => {
  it('expira após 30 minutos', () => {
    const s = criarStorage();
    registrarAtividade(s, 0);
    expect(sessaoExpirada(s, LIMITE_INATIVIDADE_MS - 1)).toBe(false);
    expect(sessaoExpirada(s, LIMITE_INATIVIDADE_MS + 1)).toBe(true);
  });
  it('sem registro não expira', () => {
    expect(sessaoExpirada(criarStorage(), Date.now())).toBe(false);
  });
  it('valor inválido não expira', () => {
    const s = criarStorage();
    s.setItem('agendamento:ultimaAtividade', 'abc');
    expect(sessaoExpirada(s, Date.now())).toBe(false);
  });
  it('atividade em outra aba (mesmo storage) renova', () => {
    const s = criarStorage();
    registrarAtividade(s, 0);
    registrarAtividade(s, 20 * 60 * 1000);
    expect(sessaoExpirada(s, 40 * 60 * 1000)).toBe(false);
  });
});
