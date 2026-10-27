export const CHAVE_ATIVIDADE = 'agendamento:ultimaAtividade';
export const LIMITE_INATIVIDADE_MS = 30 * 60 * 1000;

export function registrarAtividade(storage: Storage, agora: number): void {
  storage.setItem(CHAVE_ATIVIDADE, String(agora));
}

// Sem registro (ou valor inválido) → não expira.
export function sessaoExpirada(storage: Storage, agora: number): boolean {
  const bruto = storage.getItem(CHAVE_ATIVIDADE);
  if (bruto === null) return false;
  const ultima = Number(bruto);
  if (!Number.isFinite(ultima)) return false;
  return agora - ultima > LIMITE_INATIVIDADE_MS;
}
