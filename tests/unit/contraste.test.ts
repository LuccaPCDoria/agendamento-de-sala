import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

type RGB = [number, number, number];
type Bloco = Record<string, RGB>;

const css = fs.readFileSync(new URL('../../src/tema/tokens.css', import.meta.url), 'utf8');

function bloco(seletor: string): Bloco {
  const inicio = css.indexOf(`${seletor} {`);
  const fim = css.indexOf('}', inicio);
  const corpo = css.slice(inicio, fim);
  const out: Bloco = {};
  for (const m of corpo.matchAll(/--cor-([a-z0-9-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

function luminancia([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contraste(a: RGB, b: RGB): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const claro = bloco(':root');
const escuro = bloco('.dark');
const T: Record<string, Bloco> = { claro, escuro };

const PARES: [string, string, number][] = [
  ['texto','fundo',4.5], ['texto','superficie',4.5], ['texto','superficie-2',4.5], ['texto','primaria-suave',4.5],
  ['suave','fundo',4.5], ['suave','superficie',4.5], ['suave','superficie-2',4.5], ['suave','primaria-suave',4.5],
  ['primaria-forte','superficie',4.5], ['primaria-forte','primaria-suave',4.5], ['primaria-forte','superficie-2',4.5], ['erro-forte','superficie-2',4.5],
  ['primaria-botao-texto','primaria-botao',4.5], ['coral-texto','coral',4.5], ['coral-forte','coral-suave',4.5], ['coral-forte','superficie',4.5],
  ['erro','superficie',4.5], ['erro','fundo',4.5], ['erro-texto','erro',4.5], ['erro-forte','erro-suave',4.5], ['erro-forte','superficie',4.5],
  ['neutro-forte','neutro-suave',4.5], ['neutro-forte','superficie',4.5], ['evento-aprovada-texto','evento-aprovada',4.5], ['texto','evento-expirada',4.5],
  ['erro-forte','fundo',4.5], ['primaria-forte','fundo',4.5], ['borda-campo','fundo',3], ['borda-campo','superficie',3], ['borda-campo','superficie-2',3], ['primaria','superficie',3], ['primaria','fundo',3],
  ['neutro-forte','evento-expirada',3], ['coral-forte','superficie',3], ['evento-aprovada','superficie',3],
];

it('os dois temas têm o mesmo conjunto de tokens', () => {
  expect(Object.keys(escuro).sort()).toEqual(Object.keys(claro).sort());
});

it('contém todos os tokens da spec', () => {
  expect(Object.keys(claro)).toEqual(expect.arrayContaining(['fundo','superficie','superficie-2','borda','borda-campo','texto','suave','primaria','primaria-forte','primaria-suave','primaria-botao','primaria-botao-texto','coral','coral-texto','coral-suave','coral-forte','erro','erro-texto','erro-suave','erro-forte','neutro-suave','neutro-forte','evento-aprovada','evento-aprovada-texto','evento-expirada']));
});

it('o bloco .dark vem depois do :root (mesma especificidade)', () => {
  expect(css.indexOf('.dark {')).toBeGreaterThan(css.indexOf(':root {'));
});

describe.each(['claro', 'escuro'])('tema %s', (t) => {
  it.each(PARES)('%s sobre %s ≥ %s', (frente, fundo, min) => {
    expect(T[t][frente], `token ${frente}`).toBeDefined();
    expect(T[t][fundo], `token ${fundo}`).toBeDefined();
    expect(contraste(T[t][frente], T[t][fundo])).toBeGreaterThanOrEqual(min);
  });
});

it('declara color-scheme nos dois blocos', () => {
  expect(css).toMatch(/:root\s*{[^}]*color-scheme:\s*light/);
  expect(css).toMatch(/\.dark\s*{[^}]*color-scheme:\s*dark/);
});
