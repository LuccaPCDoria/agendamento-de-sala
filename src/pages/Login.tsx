import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <label className="block text-sm">
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block text-sm">
          Senha
          <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        {params.get('expirada') === '1' && !erro && (
          <p role="status" className="text-sm text-amber-700">Sessão expirada. Entre novamente.</p>
        )}
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={enviando}
          className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
