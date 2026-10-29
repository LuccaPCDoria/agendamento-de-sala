import { useState, type FormEvent } from 'react';
import { esquemaSala, type DadosSala } from '../../shared/esquemas';
import { TIPOS_SALA } from '../../shared/constantes';
import type { Sala } from '../../shared/tipos';
import { Botao } from '../ui/Botao';
import { Campo } from '../ui/Campo';
import { Selecao } from '../ui/Selecao';
import { ROTULO_TIPO } from '../rotulos';

interface Props {
  inicial?: Partial<Sala>;
  aoSalvar: (d: DadosSala) => void | Promise<void>;
  erro?: string | null;
  salvando?: boolean;
}

export default function FormSala({ inicial, aoSalvar, erro, salvando }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [tipo, setTipo] = useState<string>(inicial?.tipo ?? TIPOS_SALA[0]);
  const [capacidade, setCapacidade] = useState(inicial?.capacidade?.toString() ?? '');
  const [recursos, setRecursos] = useState((inicial?.recursos ?? []).join(', '));
  const [erros, setErros] = useState<Record<string, string>>({});

  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = esquemaSala.safeParse({
      nome,
      tipo,
      capacidade: capacidade.trim() === '' ? NaN : Number(capacidade),
      recursos: recursos.split(',').map((s) => s.trim()).filter(Boolean),
    });
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
      <Selecao rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} erro={erros.tipo}>
        {TIPOS_SALA.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
      </Selecao>
      <Campo rotulo="Capacidade" type="number" min={1} value={capacidade} onChange={(e) => setCapacidade(e.target.value)} erro={erros.capacidade} />
      <Campo rotulo="Recursos (separados por vírgula)" value={recursos} onChange={(e) => setRecursos(e.target.value)} erro={erros.recursos} />
      {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
      <Botao type="submit" carregando={salvando} textoCarregando="Salvando..." className="w-full">Salvar</Botao>
    </form>
  );
}
