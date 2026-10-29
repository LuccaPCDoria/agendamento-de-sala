import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Botao } from '../ui/Botao';
import { Titulo } from '../ui/Titulo';

export default function RotaProtegida({ somenteAdmin = false }: { somenteAdmin?: boolean }) {
  const { perfil, carregando, erroCarga, recarregar } = useAuth();
  if (carregando) return <p className="min-h-screen bg-fundo p-6 font-texto text-suave">Carregando...</p>;
  if (!perfil && erroCarga) {
    return (
      <div className="min-h-screen bg-fundo p-6 font-texto text-texto">
        <p role="alert" className="text-erro-forte">{erroCarga}</p>
        <Botao variante="secundario" onClick={() => void recarregar()} className="mt-3">
          Tentar novamente
        </Botao>
      </div>
    );
  }
  if (!perfil) return <Navigate to="/login" replace />;
  if (somenteAdmin && perfil.papel !== 'admin') {
    return (
      <div className="space-y-2 font-texto text-texto">
        <Titulo>Acesso negado</Titulo>
        <p className="text-suave">Você não tem permissão para ver esta página.</p>
      </div>
    );
  }
  return <Outlet />;
}
