import { useState } from 'react';
import type { StatusFiltro } from '../../shared/constantes';
import { useAuth } from '../auth/AuthProvider';
import ListaReservas from '../components/ListaReservas';
import SeletorPeriodo, { mesCorrente } from '../components/SeletorPeriodo';
import { useReservasPeriodo } from '../consultas/reservas';
import { useSalas } from '../consultas/salas';
import { ROTULO_STATUS } from '../rotulos';

const TODOS_STATUS: StatusFiltro[] = ['pendente', 'expirada', 'aprovada', 'recusada', 'cancelada'];

export default function Reservas() {
  const { perfil } = useAuth();
  const admin = perfil?.papel === 'admin';
  const [periodo, setPeriodo] = useState(() => mesCorrente());
  const [todas, setTodas] = useState(true);
  const [salaId, setSalaId] = useState('');
  const [status, setStatus] = useState<StatusFiltro[]>(TODOS_STATUS);
  const { data: salas = [] } = useSalas();
  const minhas = !admin || !todas;
  const { data, isLoading, error } = useReservasPeriodo({
    inicio: periodo.inicio.toISOString(),
    fim: periodo.fim.toISOString(),
    minhas,
    ...(admin ? { salaId: salaId || undefined, status: status.length ? status : undefined } : {}),
  });

  function alternarStatus(st: StatusFiltro) {
    setStatus((atual) => TODOS_STATUS.filter((x) => (x === st ? !atual.includes(x) : atual.includes(x))));
  }

  const classeModo = (ativo: boolean) =>
    `rounded border px-3 py-1 text-sm ${ativo ? 'bg-blue-600 text-white' : ''}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{admin && todas ? 'Reservas' : 'Minhas reservas'}</h1>
        <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} />
      </div>
      {admin && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            <button type="button" aria-pressed={todas} onClick={() => setTodas(true)}
              className={classeModo(todas)}>Todas as reservas</button>
            <button type="button" aria-pressed={!todas} onClick={() => setTodas(false)}
              className={classeModo(!todas)}>Minhas</button>
          </div>
          <label className="text-sm">
            <span className="sr-only">Filtrar por sala</span>
            <select value={salaId} onChange={(e) => setSalaId(e.target.value)} className="rounded border px-3 py-2">
              <option value="">Todas as salas</option>
              {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <fieldset className="flex flex-wrap items-center gap-3 text-sm">
            <legend className="sr-only">Filtrar por status</legend>
            {TODOS_STATUS.map((st) => (
              <label key={st} className="flex items-center gap-1">
                <input type="checkbox" checked={status.includes(st)} onChange={() => alternarStatus(st)} />
                {ROTULO_STATUS[st]}
              </label>
            ))}
          </fieldset>
        </div>
      )}
      {isLoading && <p>Carregando...</p>}
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {data && <ListaReservas reservas={data} vazio="Nenhuma reserva neste período." />}
    </div>
  );
}
