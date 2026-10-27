import { useState, type FormEvent } from 'react';
import {
  esquemaCriarUsuario, esquemaEditarUsuario,
  type DadosCriarUsuario, type DadosEditarUsuario,
} from '../../shared/esquemas';
import { PAPEIS } from '../../shared/constantes';
import type { Perfil } from '../../shared/tipos';
import { ROTULO_PAPEL } from '../rotulos';

interface Props {
  inicial?: Perfil;
  aoSalvar: (d: DadosCriarUsuario | DadosEditarUsuario) => void | Promise<void>;
  erro?: string | null;
  salvando?: boolean;
}

export default function FormUsuario({ inicial, aoSalvar, erro, salvando }: Props) {
  const edicao = !!inicial;
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<string>(inicial?.papel ?? 'usuario');
  const [erros, setErros] = useState<Record<string, string>>({});

  function enviar(e: FormEvent) {
    e.preventDefault();
    let r;
    if (inicial) {
      const dados: Record<string, string> = {};
      if (nome !== inicial.nome) dados.nome = nome;
      if (email !== inicial.email) dados.email = email;
      if (papel !== inicial.papel) dados.papel = papel;
      if (senha) dados.novaSenha = senha;
      if (Object.keys(dados).length === 0) {
        setErros({ geral: 'Nenhuma alteração para salvar.' });
        return;
      }
      r = esquemaEditarUsuario.safeParse(dados);
    } else {
      r = esquemaCriarUsuario.safeParse({ nome, email, senha, papel });
    }
    if (!r.success) {
      const novos: Record<string, string> = {};
      for (const i of r.error.issues) novos[String(i.path[0])] ??= i.message;
      setErros(novos);
      return;
    }
    setErros({});
    void aoSalvar(r.data);
  }

  const campo = 'mt-1 w-full rounded border px-3 py-2';
  const msg = (k: string) => erros[k] && <span role="alert" className="block text-sm text-red-600">{erros[k]}</span>;

  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      <label className="block text-sm">Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
        {msg('nome')}
      </label>
      <label className="block text-sm">E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
        {msg('email')}
      </label>
      <label className="block text-sm">{edicao ? 'Nova senha (opcional)' : 'Senha'}
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password" className={campo} />
        {msg(edicao ? 'novaSenha' : 'senha')}
      </label>
      <label className="block text-sm">Perfil
        <select value={papel} onChange={(e) => setPapel(e.target.value)} className={campo}>
          {PAPEIS.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
        </select>
        {msg('papel')}
      </label>
      {erros.geral && <p role="alert" className="text-sm text-red-600">{erros.geral}</p>}
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      <button type="submit" disabled={salvando}
        className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
        {salvando ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
