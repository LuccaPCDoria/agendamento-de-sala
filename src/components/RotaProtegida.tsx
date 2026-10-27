import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function RotaProtegida({ somenteAdmin = false }: { somenteAdmin?: boolean }) {
  const { perfil, carregando, erroCarga, recarregar } = useAuth();
  if (carregando) return <p className="p-6 text-slate-600">Carregando...</p>;
  if (!perfil && erroCarga) {
    return (
      <div className="p-6">
        <p role="alert" className="text-red-600">{erroCarga}</p>
        <button type="button" onClick={() => void recarregar()} className="mt-3 rounded border px-3 py-1 hover:bg-slate-100">
          Tentar novamente
        </button>
      </div>
    );
  }
  if (!perfil) return <Navigate to="/login" replace />;
  if (somenteAdmin && perfil.papel !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-slate-600">Você não tem permissão para ver esta página.</p>
      </div>
    );
  }
  return <Outlet />;
}
