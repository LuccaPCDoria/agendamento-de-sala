import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { ROTULO_PAPEL } from '../rotulos';
import { Botao } from '../ui/Botao';
import { BotaoTema } from '../ui/BotaoTema';
import { Logo } from '../ui/Logo';
import ContadorPendentes from './ContadorPendentes';
import { itensDoMenu } from './menu';
import VigiaInatividade from './VigiaInatividade';

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria focus-visible:ring-offset-2 focus-visible:ring-offset-superficie';

export default function Layout() {
  const { perfil, sair } = useAuth();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  if (!perfil) return null;
  const admin = perfil.papel === 'admin';

  const classe = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-full px-4 py-2 font-texto text-sm ${FOCO} ${
      isActive ? 'bg-primaria-suave font-bold text-primaria-forte' : 'font-medium text-suave hover:bg-superficie-2'
    }`;

  return (
    <div className="min-h-screen bg-fundo font-texto text-texto md:flex">
      <VigiaInatividade />
      <header className="relative z-40 flex items-center justify-between border-b bg-superficie px-4 py-3 md:hidden">
        <Logo tamanho={32} />
        <div className="flex items-center gap-1">
          <BotaoTema />
          <button
            type="button"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={aberto}
            onClick={() => setAberto((v) => !v)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-suave hover:bg-superficie-2 ${FOCO}`}
          >
            {aberto ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </header>
      {aberto && (
        <div
          data-testid="backdrop-menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setAberto(false)}
        />
      )}
      <aside
        className={`${aberto ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'} w-72 max-w-[85vw] flex-col justify-between overflow-y-auto border-r bg-superficie p-4 md:sticky md:top-0 md:z-auto md:flex md:h-screen md:w-64 md:max-w-none md:shrink-0`}
      >
        <div>
          <Logo comNome tamanho={40} className="mb-6" />
          <nav className="space-y-1" aria-label="Menu principal">
            {itensDoMenu(perfil.papel).map((i) => (
              <NavLink key={i.rota} to={i.rota} end={i.rota === '/'} className={classe} onClick={() => setAberto(false)}>
                <i.icone className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{i.rotulo}</span>
                {admin && i.rota === '/aprovacoes' && <ContadorPendentes />}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-6 border-t pt-4 text-sm">
          <p className="font-bold text-texto">{perfil.nome}</p>
          <span
            className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
              admin ? 'bg-primaria-suave text-primaria-forte' : 'bg-neutro-suave text-neutro-forte'
            }`}
          >
            {ROTULO_PAPEL[perfil.papel]}
          </span>
          <div className="mt-3 flex items-center justify-between">
            <Botao variante="discreto" onClick={() => void sair()}>
              Sair
            </Botao>
            <BotaoTema />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
