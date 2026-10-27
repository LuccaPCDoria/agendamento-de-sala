import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Perfil } from '../../shared/tipos';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { traduzirErroLogin } from './traduzirErroLogin';

interface AuthCtx {
  perfil: Perfil | null;
  carregando: boolean;
  entrar(email: string, senha: string): Promise<string | null>;
  sair(): Promise<void>;
}

const Contexto = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        try {
          const p = await api<Perfil>('/me');
          if (ativo) setPerfil(p);
        } catch {
          await supabase.auth.signOut();
        }
      }
      if (ativo) setCarregando(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setPerfil(null);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return traduzirErroLogin(error.message);
    try {
      setPerfil(await api<Perfil>('/me'));
      return null;
    } catch {
      await supabase.auth.signOut();
      return 'Não foi possível entrar. Tente novamente.';
    }
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
  }, []);

  const valor = useMemo(() => ({ perfil, carregando, entrar, sair }), [perfil, carregando, entrar, sair]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
