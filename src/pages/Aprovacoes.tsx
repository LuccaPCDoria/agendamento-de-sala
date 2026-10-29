import { Inbox } from 'lucide-react';
import ListaReservas from '../components/ListaReservas';
import { usePendentes } from '../consultas/reservas';
import { Titulo } from '../ui/Titulo';

export default function Aprovacoes() {
  const { data, isLoading, error } = usePendentes();
  return (
    <div className="space-y-4">
      <Titulo>Aprovações</Titulo>
      {isLoading && <p className="text-suave">Carregando...</p>}
      {error && <p role="alert" className="text-erro-forte">{error.message}</p>}
      {data && <ListaReservas reservas={data} vazio={{ icone: Inbox, mensagem: 'Nenhuma solicitação pendente' }} />}
    </div>
  );
}
