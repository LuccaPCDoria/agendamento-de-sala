import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { itensDoMenu } from './menu';
import VigiaInatividade from './VigiaInatividade';

export default function Layout() {
  const { perfil, sair } = useAuth();
  const [aberto, setAberto] = useState(false);
  if (!perfil) return null;

  const classe = ({ isActive }: { isActive: boolean }) =>
    `block rounded px-3 py-2 text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <VigiaInatividade />
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="rounded p-2 text-xl hover:bg-slate-100"
        >
          ☰
        </button>
        <span className="font-semibold">Agendamento de Salas</span>
      </header>
      <aside
        className={`${aberto ? 'block' : 'hidden'} w-full border-r bg-white p-4 md:flex md:w-60 md:flex-col md:justify-between`}
      >
        <div>
          <p className="mb-4 hidden font-semibold md:block">Agendamento de Salas</p>
          <nav className="space-y-1" aria-label="Menu principal">
            {itensDoMenu(perfil.papel).map((i) => (
              <NavLink key={i.rota} to={i.rota} end={i.rota === '/'} className={classe} onClick={() => setAberto(false)}>
                {i.rotulo}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-6 border-t pt-4 text-sm">
          <p className="mb-2 text-slate-700">{perfil.nome}</p>
          <button type="button" onClick={() => void sair()} className="rounded border px-3 py-1 hover:bg-slate-100">
            Sair
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
