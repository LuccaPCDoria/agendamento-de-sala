import ListaReservas from '../components/ListaReservas';
import { usePendentes } from '../consultas/reservas';

export default function Aprovacoes() {
  const { data, isLoading, error } = usePendentes();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Aprovações</h1>
      {isLoading && <p>Carregando...</p>}
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {data && <ListaReservas reservas={data} vazio="Nenhuma reserva pendente." />}
    </div>
  );
}
