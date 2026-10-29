import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Botao } from '../ui/Botao';
import { Campo } from '../ui/Campo';
import { Cartao } from '../ui/Cartao';
import { Logo } from '../ui/Logo';

export default function Login() {
  const { perfil, carregando, entrar } = useAuth();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!carregando && perfil) return <Navigate to="/" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const msg = await entrar(email, senha);
    setEnviando(false);
    if (msg) setErro(msg);
    else navegar('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-fundo font-texto md:flex-row">
      <aside className="flex min-h-[140px] flex-col justify-center gap-3 bg-[linear-gradient(135deg,#0B7A6E,#08695F)] p-6 text-primaria-botao-texto dark:bg-[linear-gradient(135deg,#123A35,#0B1413)] dark:text-texto md:w-1/2 md:justify-between md:p-12">
        <div className="flex items-center gap-3">
          <Logo variante="branca" className="dark:hidden" />
          <Logo className="hidden dark:block" />
          <span className="hidden font-texto text-base font-medium md:inline">Agendamento de Salas</span>
        </div>
        <p className="font-titulo text-lg font-extrabold leading-snug md:text-[28px]">
          Reserve a sala certa, sem conflito.
        </p>
        <div aria-hidden="true" className="hidden grid-cols-4 gap-3 md:grid md:max-w-xs">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={`aspect-square rounded-xl ${
                i === 1 || i === 6 || i === 11
                  ? 'bg-coral'
                  : i === 3 || i === 4 || i === 9
                    ? 'bg-primaria-botao-texto/80'
                    : 'bg-primaria-botao-texto/20'
              }`}
            />
          ))}
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center p-4 md:p-12">
        <Cartao className="w-full max-w-sm p-6">
          <form onSubmit={enviar} className="space-y-4">
            <h1 className="font-titulo text-xl font-extrabold text-texto">Entrar</h1>
            <Campo rotulo="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Campo rotulo="Senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            {params.get('expirada') === '1' && !erro && (
              <p role="status" className="text-sm text-coral-forte">Sessão expirada. Entre novamente.</p>
            )}
            {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
            <Botao type="submit" carregando={enviando} textoCarregando="Entrando..." className="w-full">
              Entrar
            </Botao>
          </form>
        </Cartao>
      </main>
    </div>
  );
}
