import { useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { FUSO } from '../../shared/constantes';
import { ErroApi } from '../lib/api';
import { buscarRelatorioMensal } from '../consultas/relatorios';
import { gerarPdfMensal } from '../relatorios/gerarPdf';

export default function Relatorios() {
  const [mes, setMes] = useState(() => formatInTimeZone(new Date(), FUSO, 'yyyy-MM'));
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarRelatorioMensal(mes);
      gerarPdfMensal(dados).save(`reservas-${mes}.pdf`);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Erro inesperado. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Relatórios</h1>
      <div className="flex items-end gap-3">
        <label className="text-sm">
          Mês
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-2 py-1" />
        </label>
        <button type="button" onClick={() => void baixar()} disabled={carregando || !mes}
          className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Baixar PDF
        </button>
      </div>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
    </div>
  );
}
