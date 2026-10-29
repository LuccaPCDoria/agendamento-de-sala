import { useSyncExternalStore } from 'react';
import { alternar, assinar, obterTema, type Tema } from './tema';

export function useTema(): { tema: Tema; alternar: () => void } {
  const tema = useSyncExternalStore(assinar, obterTema, obterTema);
  return { tema, alternar };
}
