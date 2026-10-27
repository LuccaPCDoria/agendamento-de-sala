import { useState } from 'react';
import ListaReservas from '../components/ListaReservas';
import SeletorPeriodo, { mesCorrente } from '../components/SeletorPeriodo';
import { useReservasPeriodo } from '../consultas/reservas';

export default function Reservas() {
  const [periodo, setPeriodo] = useState(() => mesCorrente());
  const { data, isLoading, error } = useReservasPeriodo(
    periodo.inicio.toISOString(), periodo.fim.toISOString(), true);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Minhas reservas</h1>
        <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} />
      </div>
      {isLoading && <p>Carregando...</p>}
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {data && <ListaReservas reservas={data} vazio="Nenhuma reserva neste período." />}
    </div>
  );
}
