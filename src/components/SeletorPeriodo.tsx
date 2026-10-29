import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Botao } from '../ui/Botao';

export interface Periodo { inicio: Date; fim: Date }

export function mesCorrente(ref = new Date()): Periodo {
  return {
    inicio: new Date(ref.getFullYear(), ref.getMonth(), 1),
    fim: new Date(ref.getFullYear(), ref.getMonth() + 1, 1),
  };
}

interface Props { valor: Periodo; aoMudar: (p: Periodo) => void }

export default function SeletorPeriodo({ valor, aoMudar }: Props) {
  const deslocar = (n: number) =>
    aoMudar(mesCorrente(new Date(valor.inicio.getFullYear(), valor.inicio.getMonth() + n, 1)));
  const formatado = valor.inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const titulo = formatado.charAt(0).toUpperCase() + formatado.slice(1);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Botao variante="secundario" onClick={() => deslocar(-1)} icone={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}>
        <span className="sr-only sm:not-sr-only">Mês anterior</span>
      </Botao>
      <span className="min-w-32 text-center font-bold text-texto">{titulo}</span>
      <Botao variante="secundario" onClick={() => deslocar(1)} icone={<ChevronRight className="h-4 w-4" aria-hidden="true" />}>
        <span className="sr-only sm:not-sr-only">Próximo mês</span>
      </Botao>
    </div>
  );
}
