import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Perfil } from '../../shared/tipos';
import { api, ErroApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { registrarAtividade } from './inatividade';
import { traduzirErroLogin } from './traduzirErroLogin';

interface AuthCtx {
  perfil: Perfil | null;
  carregando: boolean;
  erroCarga: string | null;
  entrar(email: string, senha: string): Promise<string | null>;
  sair(): Promise<void>;
  expirarSessao(): Promise<void>;
  recarregar(): Promise<void>;
}

const Contexto = createContext<AuthCtx | null>(null);

const MSG_CARGA = 'Não foi possível carregar seu perfil. Verifique a conexão e tente novamente.';

function recusado(e: unknown): boolean {
  return e instanceof ErroApi && (e.status === 401 || e.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  // Carrega o perfil da sessão atual; só encerra a sessão se a API recusar (401/403).
  const carregarPerfil = useCallback(async (ativo: () => boolean = () => true) => {
    setErroCarga(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const p = await api<Perfil>('/me');
        if (ativo()) setPerfil(p);
      }
    } catch (e) {
      if (recusado(e)) {
        if (ativo()) await supabase.auth.signOut({ scope: 'local' });
      } else if (ativo()) {
        setErroCarga(MSG_CARGA);
      }
    }
    if (ativo()) setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;
    void carregarPerfil(() => ativo);
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setPerfil(null);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    await carregarPerfil();
  }, [carregarPerfil]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return traduzirErroLogin(error.message);
    try {
      setPerfil(await api<Perfil>('/me'));
      setErroCarga(null);
      try {
        registrarAtividade(window.localStorage, Date.now());
      } catch {
        /* localStorage indisponível: sem logout por inatividade */
      }
      return null;
    } catch (e) {
      if (recusado(e)) await supabase.auth.signOut({ scope: 'local' });
      return 'Não foi possível entrar. Tente novamente.';
    }
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
  }, []);

  const expirarSessao = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setPerfil(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ perfil, carregando, erroCarga, entrar, sair, expirarSessao, recarregar }),
    [perfil, carregando, erroCarga, entrar, sair, expirarSessao, recarregar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
