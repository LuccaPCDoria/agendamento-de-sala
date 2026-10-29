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
  const titulo = valor.inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return (
    <div className="flex items-center gap-2">
      <Botao variante="secundario" onClick={() => deslocar(-1)} icone={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}>
        Mês anterior
      </Botao>
      <span className="min-w-32 text-center font-bold capitalize text-texto">{titulo}</span>
      <Botao variante="secundario" onClick={() => deslocar(1)} icone={<ChevronRight className="h-4 w-4" aria-hidden="true" />}>
        Próximo mês
      </Botao>
    </div>
  );
}
