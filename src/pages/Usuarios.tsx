import { useMemo, useState } from 'react';
import { PAPEIS, type Papel } from '../../shared/constantes';
import type { DadosCriarUsuario } from '../../shared/esquemas';
import type { Perfil } from '../../shared/tipos';
import BarraFiltros, { SemResultado } from '../components/BarraFiltros';
import FormUsuario from '../components/FormUsuario';
import { FILTRO_USUARIOS_VAZIO, filtrarUsuarios, filtroAtivo, type Situacao } from '../filtros/filtrar';
import { Campo } from '../ui/Campo';
import { Selecao } from '../ui/Selecao';
import Modal from '../components/Modal';
import { useCriarUsuario, useEditarUsuario, useInativarUsuario, useReativarUsuario, useUsuarios } from '../consultas/usuarios';
import { Plus, Users } from "lucide-react";
import { Botao } from "../ui/Botao";
import { Cartao } from "../ui/Cartao";
import { EstadoVazio } from "../ui/EstadoVazio";
import { SeloSituacao } from "../ui/SeloSituacao";
import { Titulo } from "../ui/Titulo";
import { CONFIRMA_INATIVAR, ROTULO_PAPEL } from '../rotulos';

export default function Usuarios() {
  const { data, isLoading, error } = useUsuarios();
  const criar = useCriarUsuario();
  const editar = useEditarUsuario();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Perfil | null>(null);
  const inativar = useInativarUsuario();
  const reativar = useReativarUsuario();
  const erroAcao = inativar.error?.message ?? reativar.error?.message ?? null;
  const [filtro, setFiltro] = useState(FILTRO_USUARIOS_VAZIO);
  const visiveis = useMemo(() => filtrarUsuarios(data ?? [], filtro), [data, filtro]);
  const limpar = () => setFiltro(FILTRO_USUARIOS_VAZIO);

  function alternar(u: Perfil) {
    inativar.reset();
    reativar.reset();
    if (u.ativo) {
      if (window.confirm(CONFIRMA_INATIVAR)) inativar.mutate(u.id);
    } else reativar.mutate(u.id);
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
      <Titulo acao={<Botao icone={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setAberto(true)}>Novo usuário</Botao>}>Usuários</Titulo>
      {isLoading && <p className="text-suave">Carregando...</p>}
      {error && <p role="alert" className="text-erro">{error.message}</p>}
      {erroAcao && <p role="alert" className="text-erro">{erroAcao}</p>}
      {data && data.length === 0 && <Cartao><EstadoVazio icone={Users} mensagem="Nenhum usuário cadastrado" /></Cartao>}
      {data && data.length > 0 && (
        <BarraFiltros total={data.length} visiveis={visiveis.length} ativo={filtroAtivo(filtro)} aoLimpar={limpar}>
          <Campo rotulo="Buscar" placeholder="Nome ou e-mail" value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })} />
          <Selecao rotulo="Perfil" value={filtro.papel} onChange={(e) => setFiltro({ ...filtro, papel: e.target.value as Papel | '' })}>
            <option value="">Todos</option>
            {PAPEIS.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
          </Selecao>
          <Selecao rotulo="Situação" value={filtro.situacao} onChange={(e) => setFiltro({ ...filtro, situacao: e.target.value as Situacao })}>
            <option value="">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </Selecao>
        </BarraFiltros>
      )}
      {data && data.length > 0 && visiveis.length === 0 && <Cartao><SemResultado aoLimpar={limpar} /></Cartao>}
      {visiveis.length > 0 && (
        <Cartao className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b">
              <th className="p-2 font-bold text-suave">Nome</th><th className="hidden p-2 font-bold text-suave sm:table-cell">E-mail</th><th className="p-2 font-bold text-suave">Perfil</th>
              <th className="p-2 font-bold text-suave">Situação</th><th className="p-2" />
            </tr></thead>
            <tbody>
              {visiveis.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0 hover:bg-superficie-2">
                  <td className="p-2">{u.nome}</td>
                  <td className="hidden p-2 sm:table-cell">{u.email}</td>
                  <td className="p-2">{ROTULO_PAPEL[u.papel]}</td>
                  <td className="p-2"><SeloSituacao ativo={u.ativo} rotulos={['Ativo', 'Inativo']} /></td>
                  <td className="p-2">
                    <div className="flex gap-2">
                    <Botao variante="secundario" onClick={() => setEditando(u)}>Editar</Botao>
                    <Botao variante={u.ativo ? "perigoContorno" : "secundario"} disabled={inativar.isPending || reativar.isPending}
                      onClick={() => alternar(u)}>
                      {u.ativo ? "Inativar" : "Reativar"}
                    </Botao>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
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
