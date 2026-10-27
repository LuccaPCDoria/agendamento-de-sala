import { useState } from 'react';
import type { Sala } from '../../shared/tipos';
import FormSala from '../components/FormSala';
import Modal from '../components/Modal';
import { useCriarSala, useEditarSala, useSalas } from '../consultas/salas';
import { ROTULO_TIPO } from '../rotulos';

export default function Salas() {
  const { data, isLoading, error } = useSalas(true);
  const criar = useCriarSala();
  const editar = useEditarSala();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Sala | null>(null);
  const mut = editando ? editar : criar;

  function fechar() {
    setAberto(false);
    setEditando(null);
    criar.reset();
    editar.reset();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Salas</h1>
        <button type="button" onClick={() => setAberto(true)}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Nova sala</button>
      </div>
      {isLoading && <p>Carregando...</p>}
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b">
              <th className="p-2">Nome</th><th className="p-2">Tipo</th><th className="p-2">Capacidade</th>
              <th className="p-2">Recursos</th><th className="p-2">Situação</th><th className="p-2" />
            </tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-2">{s.nome}</td>
                  <td className="p-2">{ROTULO_TIPO[s.tipo]}</td>
                  <td className="p-2">{s.capacidade}</td>
                  <td className="p-2">
                    {s.recursos.map((r) => (
                      <span key={r} className="mr-1 rounded bg-slate-100 px-2 py-0.5 text-xs">{r}</span>
                    ))}
                  </td>
                  <td className="p-2">{s.ativa ? 'Ativa' : 'Inativa'}</td>
                  <td className="p-2">
                    <button type="button" onClick={() => setEditando(s)} className="text-blue-600">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(aberto || editando) && (
        <Modal titulo={editando ? 'Editar sala' : 'Nova sala'} aoFechar={fechar}>
          <FormSala
            inicial={editando ?? undefined}
            salvando={mut.isPending}
            erro={mut.error?.message ?? null}
            aoSalvar={async (dados) => {
              try {
                if (editando) await editar.mutateAsync({ id: editando.id, dados });
                else await criar.mutateAsync(dados);
                fechar();
              } catch { /* erro exibido no formulário */ }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
