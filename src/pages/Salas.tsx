import { useState } from 'react';
import type { Sala } from '../../shared/tipos';
import FormSala from '../components/FormSala';
import Modal from '../components/Modal';
import { useCriarSala, useEditarSala, useInativarSala, useReativarSala, useSalas } from '../consultas/salas';
import { CONFIRMA_INATIVAR, ROTULO_TIPO } from '../rotulos';

export default function Salas() {
  const { data, isLoading, error } = useSalas(true);
  const criar = useCriarSala();
  const editar = useEditarSala();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Sala | null>(null);
  const inativar = useInativarSala();
  const reativar = useReativarSala();
  const erroAcao = inativar.error?.message ?? reativar.error?.message ?? null;

  function alternar(s: Sala) {
    inativar.reset();
    reativar.reset();
    if (s.ativa) {
      if (window.confirm(CONFIRMA_INATIVAR)) inativar.mutate(s.id);
    } else reativar.mutate(s.id);
  }
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
      {erroAcao && <p role="alert" className="text-red-600">{erroAcao}</p>}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b">
              <th className="p-2">Nome</th><th className="p-2">Tipo</th><th className="p-2">Capacidade</th>
              <th className="hidden p-2 sm:table-cell">Recursos</th><th className="p-2">Situação</th><th className="p-2" />
            </tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-2">{s.nome}</td>
                  <td className="p-2">{ROTULO_TIPO[s.tipo]}</td>
                  <td className="p-2">{s.capacidade}</td>
                  <td className="hidden p-2 sm:table-cell">
                    {s.recursos.map((r) => (
                      <span key={r} className="mr-1 rounded bg-slate-100 px-2 py-0.5 text-xs">{r}</span>
                    ))}
                  </td>
                  <td className="p-2">{s.ativa ? 'Ativa' : 'Inativa'}</td>
                  <td className="p-2">
                    <button type="button" onClick={() => setEditando(s)} className="text-blue-600">Editar</button>
                    <button type="button" disabled={inativar.isPending || reativar.isPending}
                      onClick={() => alternar(s)} className="ml-3 text-red-600 disabled:opacity-50">
                      {s.ativa ? 'Inativar' : 'Reativar'}
                    </button>
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
