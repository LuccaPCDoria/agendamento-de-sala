import { supabase } from './supabase';

export class ErroApi extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

export interface OpcoesApi {
  metodo?: 'GET' | 'POST' | 'PATCH';
  corpo?: unknown;
  query?: Record<string, string | undefined>;
}

export async function api<T>(caminho: string, opcoes: OpcoesApi = {}): Promise<T> {
  const { metodo = 'GET', corpo, query } = opcoes;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) params.set(k, v);
  const qs = params.toString();
  const url = `/api${caminho}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';

  const resp = await fetch(url, {
    method: metodo,
    headers,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });

  let json: unknown = null;
  try {
    json = await resp.json();
  } catch {
    json = null;
  }
  if (!resp.ok) {
    const msg = (json as { erro?: string } | null)?.erro ?? 'Erro inesperado. Tente novamente.';
    throw new ErroApi(resp.status, msg);
  }
  return json as T;
}
