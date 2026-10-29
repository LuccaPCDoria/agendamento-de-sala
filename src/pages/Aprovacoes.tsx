import { Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TIPOS_SALA, type TipoSala } from '../../shared/constantes';
import BarraFiltros, { SemResultado } from '../components/BarraFiltros';
import ListaReservas from '../components/ListaReservas';
import { usePendentes } from '../consultas/reservas';
import { useSalas } from '../consultas/salas';
import { FILTRO_PENDENTES_VAZIO, filtrarPendentes, filtroAtivo } from '../filtros/filtrar';
import { ROTULO_TIPO } from '../rotulos';
import { Campo } from '../ui/Campo';
import { Cartao } from '../ui/Cartao';
import { Selecao } from '../ui/Selecao';
import { Titulo } from '../ui/Titulo';

export default function Aprovacoes() {
  const { data, isLoading, error } = usePendentes();
  const { data: salas = [] } = useSalas();
  const [filtro, setFiltro] = useState(FILTRO_PENDENTES_VAZIO);
  const visiveis = useMemo(() => filtrarPendentes(data ?? [], filtro), [data, filtro]);
  const limpar = () => setFiltro(FILTRO_PENDENTES_VAZIO);
  return (
    <div className="space-y-4">
      <Titulo>Aprovações</Titulo>
      {isLoading && <p className="text-suave">Carregando...</p>}
      {error && <p role="alert" className="text-erro-forte">{error.message}</p>}
      {data && data.length > 0 && (
        <BarraFiltros total={data.length} visiveis={visiveis.length} ativo={filtroAtivo(filtro)} aoLimpar={limpar}>
          <Campo rotulo="Buscar" placeholder="Solicitante ou finalidade" value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })} />
          <Selecao rotulo="Sala" value={filtro.salaId} onChange={(e) => setFiltro({ ...filtro, salaId: e.target.value })}>
            <option value="">Todas</option>
            {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Selecao>
          <Selecao rotulo="Tipo" value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value as TipoSala | '' })}>
            <option value="">Todos</option>
            {TIPOS_SALA.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
          </Selecao>
          <Campo rotulo="De" type="date" value={filtro.de} max={filtro.ate || undefined}
            onChange={(e) => setFiltro({ ...filtro, de: e.target.value })} />
          <Campo rotulo="Até" type="date" value={filtro.ate} min={filtro.de || undefined}
            onChange={(e) => setFiltro({ ...filtro, ate: e.target.value })} />
        </BarraFiltros>
      )}
      {data && data.length > 0 && visiveis.length === 0
        ? <Cartao><SemResultado aoLimpar={limpar} /></Cartao>
        : data && <ListaReservas reservas={visiveis} vazio={{ icone: Inbox, mensagem: 'Nenhuma solicitação pendente' }} />}
    </div>
  );
}
