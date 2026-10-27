import { useEffect, useRef } from 'react';
import { registrarAtividade, sessaoExpirada } from './inatividade';

const EVENTOS = ['mousemove', 'keydown', 'touchstart', 'click'] as const;
const THROTTLE_MS = 15_000;
const VERIFICACAO_MS = 60_000;

function storageSeguro(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Encerra por inatividade; se o localStorage estiver indisponível, a regra simplesmente não se aplica.
export function useInatividade(aoExpirar: () => void): void {
  const callback = useRef(aoExpirar);
  callback.current = aoExpirar;

  useEffect(() => {
    const storage = storageSeguro();
    if (!storage) return;
    let ultimoRegistro = 0;
    let expirou = false;

    const verificar = () => {
      if (expirou) return;
      try {
        if (sessaoExpirada(storage, Date.now())) {
          expirou = true;
          callback.current();
        }
      } catch {
        /* storage indisponível: ignora */
      }
    };

    const aoInteragir = () => {
      const agora = Date.now();
      if (expirou || agora - ultimoRegistro < THROTTLE_MS) return;
      ultimoRegistro = agora;
      try {
        registrarAtividade(storage, agora);
      } catch {
        /* ignora */
      }
    };

    verificar();
    EVENTOS.forEach((e) => window.addEventListener(e, aoInteragir, { passive: true }));
    const timer = window.setInterval(verificar, VERIFICACAO_MS);
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, aoInteragir));
      window.clearInterval(timer);
    };
  }, []);
}
