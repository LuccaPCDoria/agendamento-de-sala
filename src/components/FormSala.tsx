import { useState, type FormEvent } from 'react';
import { esquemaSala, type DadosSala } from '../../shared/esquemas';
import { TIPOS_SALA } from '../../shared/constantes';
import type { Sala } from '../../shared/tipos';
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

  const campo = 'mt-1 w-full rounded border px-3 py-2';
  const msg = (k: string) => erros[k] && <span role="alert" className="block text-sm text-red-600">{erros[k]}</span>;

  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      <label className="block text-sm">Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
        {msg('nome')}
      </label>
      <label className="block text-sm">Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
          {TIPOS_SALA.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
        </select>
        {msg('tipo')}
      </label>
      <label className="block text-sm">Capacidade
        <input type="number" min={1} value={capacidade} onChange={(e) => setCapacidade(e.target.value)} className={campo} />
        {msg('capacidade')}
      </label>
      <label className="block text-sm">Recursos (separados por vírgula)
        <input value={recursos} onChange={(e) => setRecursos(e.target.value)} className={campo} />
        {msg('recursos')}
      </label>
      {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
      <button type="submit" disabled={salvando}
        className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
        {salvando ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
