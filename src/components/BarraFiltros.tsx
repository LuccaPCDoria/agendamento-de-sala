import type { ReactNode } from 'react';
import { SearchX, X } from 'lucide-react';
import { Botao } from '../ui/Botao';
import { Cartao } from '../ui/Cartao';
import { EstadoVazio } from '../ui/EstadoVazio';

interface Props {
  total: number;
  visiveis: number;
  ativo: boolean;
  aoLimpar: () => void;
  children: ReactNode;
}

export default function BarraFiltros({ total, visiveis, ativo, aoLimpar, children }: Props) {
  return (
    <Cartao role="search" className="flex flex-wrap items-end gap-3 p-4">
      {children}
      <div className="ml-auto flex items-center gap-3 pb-2">
        <span aria-live="polite" className="text-sm text-suave">{`${visiveis} de ${total}`}</span>
        {ativo && (
          <Botao variante="discreto" icone={<X className="h-4 w-4" aria-hidden="true" />} onClick={aoLimpar}>
            Limpar filtros
          </Botao>
        )}
      </div>
    </Cartao>
  );
}

export function SemResultado({ aoLimpar }: { aoLimpar: () => void }) {
  return (
    <div className="flex flex-col items-center pb-6">
      <EstadoVazio icone={SearchX} mensagem="Nenhum resultado para os filtros" />
      <Botao variante="secundario" onClick={aoLimpar}>Limpar filtros</Botao>
    </div>
  );
}
