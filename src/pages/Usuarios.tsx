import { useState } from 'react';
import type { DadosCriarUsuario } from '../../shared/esquemas';
import type { Perfil } from '../../shared/tipos';
import FormUsuario from '../components/FormUsuario';
import Modal from '../components/Modal';
import { useCriarUsuario, useEditarUsuario, useUsuarios } from '../consultas/usuarios';
import { ROTULO_PAPEL } from '../rotulos';

export default function Usuarios() {
  const { data, isLoading, error } = useUsuarios();
  const criar = useCriarUsuario();
  const editar = useEditarUsuario();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Perfil | null>(null);
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
        <h1 className="text-xl font-semibold">Usuários</h1>
        <button type="button" onClick={() => setAberto(true)}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Novo usuário</button>
      </div>
      {isLoading && <p>Carregando...</p>}
      {error && <p role="alert" className="text-red-600">{error.message}</p>}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b">
              <th className="p-2">Nome</th><th className="p-2">E-mail</th><th className="p-2">Perfil</th>
              <th className="p-2">Situação</th><th className="p-2" />
            </tr></thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-2">{u.nome}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{ROTULO_PAPEL[u.papel]}</td>
                  <td className="p-2">{u.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="p-2">
                    <button type="button" onClick={() => setEditando(u)} className="text-blue-600">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(aberto || editando) && (
        <Modal titulo={editando ? 'Editar usuário' : 'Novo usuário'} aoFechar={fechar}>
          <FormUsuario
            inicial={editando ?? undefined}
            salvando={mut.isPending}
            erro={mut.error?.message ?? null}
            aoSalvar={async (dados) => {
              try {
                if (editando) await editar.mutateAsync({ id: editando.id, dados });
                else await criar.mutateAsync(dados as DadosCriarUsuario);
                fechar();
              } catch { /* erro exibido no formulário */ }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
