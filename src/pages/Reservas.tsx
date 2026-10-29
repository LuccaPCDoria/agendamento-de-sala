import { CalendarX2 } from 'lucide-react';
import { useState } from 'react';
import type { StatusFiltro } from '../../shared/constantes';
import { useAuth } from '../auth/AuthProvider';
import ListaReservas from '../components/ListaReservas';
import SeletorPeriodo, { mesCorrente } from '../components/SeletorPeriodo';
import { useReservasPeriodo } from '../consultas/reservas';
import { useSalas } from '../consultas/salas';
import { ROTULO_STATUS } from '../rotulos';
import { Selecao } from '../ui/Selecao';
import { Titulo } from '../ui/Titulo';

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
    salaId: salaId || undefined,
    status: status.length ? status : undefined,
  });

  function alternarStatus(st: StatusFiltro) {
    setStatus((atual) => TODOS_STATUS.filter((x) => (x === st ? !atual.includes(x) : atual.includes(x))));
  }

  const classeModo = (ativo: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie ${ativo ? 'bg-primaria-suave text-primaria-forte' : 'bg-transparent text-suave hover:bg-superficie-2'}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Titulo>{admin && todas ? 'Reservas' : 'Minhas reservas'}</Titulo>
        <SeletorPeriodo valor={periodo} aoMudar={setPeriodo} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {admin && (
          <div className="flex gap-1 rounded-full bg-superficie-2 p-1">
            <button type="button" aria-pressed={todas} onClick={() => setTodas(true)}
              className={classeModo(todas)}>Todas as reservas</button>
            <button type="button" aria-pressed={!todas} onClick={() => setTodas(false)}
              className={classeModo(!todas)}>Minhas</button>
          </div>
        )}
        <Selecao rotulo="Filtrar por sala" rotuloOculto value={salaId} onChange={(e) => setSalaId(e.target.value)}>
          <option value="">Todas as salas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </Selecao>
          <fieldset className="flex flex-wrap items-center gap-3 text-sm text-texto">
            <legend className="sr-only">Filtrar por status</legend>
            {TODOS_STATUS.map((st) => (
              <label key={st} className="flex items-center gap-1.5">
                <input type="checkbox" className="accent-primaria" checked={status.includes(st)} onChange={() => alternarStatus(st)} />
                {ROTULO_STATUS[st]}
              </label>
            ))}
          </fieldset>
      </div>
      {isLoading && <p className="text-suave">Carregando...</p>}
      {error && <p role="alert" className="text-erro-forte">{error.message}</p>}
      {data && <ListaReservas reservas={data} vazio={{ icone: CalendarX2, mensagem: 'Nenhuma reserva neste período' }} />}
    </div>
  );
}
