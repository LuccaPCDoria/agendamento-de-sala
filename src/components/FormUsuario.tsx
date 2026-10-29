import { useState, type FormEvent } from 'react';
import {
  esquemaCriarUsuario, esquemaEditarUsuario,
  type DadosCriarUsuario, type DadosEditarUsuario,
} from '../../shared/esquemas';
import { PAPEIS } from '../../shared/constantes';
import type { Perfil } from '../../shared/tipos';
import { Botao } from '../ui/Botao';
import { Campo } from '../ui/Campo';
import { Selecao } from '../ui/Selecao';
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


  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} />
      <Campo rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
      <Campo rotulo={edicao ? 'Nova senha (opcional)' : 'Senha'} type="password" value={senha}
        onChange={(e) => setSenha(e.target.value)} autoComplete="new-password"
        erro={edicao ? erros.novaSenha : erros.senha} />
      <Selecao rotulo="Perfil" value={papel} onChange={(e) => setPapel(e.target.value)} erro={erros.papel}>
        {PAPEIS.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
      </Selecao>
      {erros.geral && <p role="alert" className="text-sm text-erro">{erros.geral}</p>}
      {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
      <Botao type="submit" carregando={salvando} textoCarregando="Salvando..." className="w-full">Salvar</Botao>
    </form>
  );
}
