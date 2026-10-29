import { useMemo, useState } from 'react';
import { TIPOS_SALA, type TipoSala } from '../../shared/constantes';
import type { Sala } from '../../shared/tipos';
import BarraFiltros, { SemResultado } from '../components/BarraFiltros';
import FormSala from '../components/FormSala';
import { FILTRO_SALAS_VAZIO, filtrarSalas, filtroAtivo, type Situacao } from '../filtros/filtrar';
import { Campo } from '../ui/Campo';
import { Selecao } from '../ui/Selecao';
import Modal from '../components/Modal';
import { useCriarSala, useEditarSala, useInativarSala, useReativarSala, useSalas } from '../consultas/salas';
import { Plus, DoorOpen } from "lucide-react";
import { Botao } from "../ui/Botao";
import { Cartao } from "../ui/Cartao";
import { EstadoVazio } from "../ui/EstadoVazio";
import { SeloSituacao } from "../ui/SeloSituacao";
import { Titulo } from "../ui/Titulo";
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
  const [filtro, setFiltro] = useState(FILTRO_SALAS_VAZIO);
  const visiveis = useMemo(() => filtrarSalas(data ?? [], filtro), [data, filtro]);
  const limpar = () => setFiltro(FILTRO_SALAS_VAZIO);

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
      <Titulo acao={<Botao icone={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setAberto(true)}>Nova sala</Botao>}>Salas</Titulo>
      {isLoading && <p className="text-suave">Carregando...</p>}
      {error && <p role="alert" className="text-erro">{error.message}</p>}
      {erroAcao && <p role="alert" className="text-erro">{erroAcao}</p>}
      {data && data.length === 0 && <Cartao><EstadoVazio icone={DoorOpen} mensagem="Nenhuma sala cadastrada" /></Cartao>}
      {data && data.length > 0 && (
        <BarraFiltros total={data.length} visiveis={visiveis.length} ativo={filtroAtivo(filtro)} aoLimpar={limpar}>
          <Campo rotulo="Buscar" placeholder="Nome ou recurso" value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })} />
          <Selecao rotulo="Tipo" value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value as TipoSala | '' })}>
            <option value="">Todos</option>
            {TIPOS_SALA.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
          </Selecao>
          <Selecao rotulo="Situação" value={filtro.situacao} onChange={(e) => setFiltro({ ...filtro, situacao: e.target.value as Situacao })}>
            <option value="">Todas</option>
            <option value="ativo">Ativas</option>
            <option value="inativo">Inativas</option>
          </Selecao>
          <Campo rotulo="Capacidade mínima" type="number" min={1} className="w-36" value={filtro.capacidadeMin}
            onChange={(e) => setFiltro({ ...filtro, capacidadeMin: e.target.value })} />
        </BarraFiltros>
      )}
      {data && data.length > 0 && visiveis.length === 0 && <Cartao><SemResultado aoLimpar={limpar} /></Cartao>}
      {visiveis.length > 0 && (
        <Cartao className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b">
              <th className="p-2 font-bold text-suave">Nome</th><th className="p-2 font-bold text-suave">Tipo</th><th className="p-2 font-bold text-suave">Capacidade</th>
              <th className="hidden p-2 font-bold text-suave sm:table-cell">Recursos</th><th className="p-2 font-bold text-suave">Situação</th><th className="p-2" />
            </tr></thead>
            <tbody>
              {visiveis.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0 hover:bg-superficie-2">
                  <td className="p-2">{s.nome}</td>
                  <td className="p-2">{ROTULO_TIPO[s.tipo]}</td>
                  <td className="p-2">{s.capacidade}</td>
                  <td className="hidden p-2 sm:table-cell">
                    {s.recursos.map((r) => (
                      <span key={r} className="mr-1 inline-block rounded-full bg-superficie-2 px-2 py-0.5 text-xs text-texto">{r}</span>
                    ))}
                  </td>
                  <td className="p-2"><SeloSituacao ativo={s.ativa} rotulos={['Ativa', 'Inativa']} /></td>
                  <td className="p-2">
                    <div className="flex gap-2">
                    <Botao variante="secundario" onClick={() => setEditando(s)}>Editar</Botao>
                    <Botao variante={s.ativa ? "perigoContorno" : "secundario"} disabled={inativar.isPending || reativar.isPending}
                      onClick={() => alternar(s)}>
                      {s.ativa ? "Inativar" : "Reativar"}
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
