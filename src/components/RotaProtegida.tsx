import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Botao } from '../ui/Botao';

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
      <div className="min-h-screen bg-fundo p-6 font-texto text-texto">
        <h1 className="font-titulo text-xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-suave">Você não tem permissão para ver esta página.</p>
      </div>
    );
  }
  return <Outlet />;
}
