export type Tema = 'claro' | 'escuro';

export const CHAVE_TEMA = 'agendamento:tema';
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

const ouvintes = new Set<() => void>();
let iniciado = false;
let atual: Tema | null = null;
let escolhaExplicita = false;

export function resolverTema(salvo: string | null, prefereEscuro: boolean): Tema {
  if (salvo === 'claro' || salvo === 'escuro') return salvo;
  return prefereEscuro ? 'escuro' : 'claro';
}

function lerSalvo(): string | null {
  try {
    return localStorage.getItem(CHAVE_TEMA);
  } catch {
    return null;
  }
}

function aplicar(tema: Tema): void {
  atual = tema;
  document.documentElement.classList.toggle('dark', tema === 'escuro');
  ouvintes.forEach((cb) => cb());
}

export function iniciarTema(): void {
  if (iniciado) return;
  iniciado = true;
  const mq = window.matchMedia?.(CONSULTA_ESCURO);
  const salvo = lerSalvo();
  escolhaExplicita = salvo === 'claro' || salvo === 'escuro';
  aplicar(resolverTema(salvo, !!mq?.matches));
  mq?.addEventListener?.('change', (e: { matches: boolean }) => {
    if (escolhaExplicita) return;
    aplicar(e.matches ? 'escuro' : 'claro');
  });
}

export function obterTema(): Tema {
  if (atual) return atual;
  return document.documentElement.classList.contains('dark') ? 'escuro' : 'claro';
}

export function assinar(cb: () => void): () => void {
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}

export function alternar(): void {
  const novo: Tema = obterTema() === 'escuro' ? 'claro' : 'escuro';
  escolhaExplicita = true;
  try {
    localStorage.setItem(CHAVE_TEMA, novo);
  } catch {
    // sem persistência: vale só em memória até recarregar
  }
  aplicar(novo);
}
