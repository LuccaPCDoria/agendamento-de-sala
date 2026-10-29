import { useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { FUSO } from '../../shared/constantes';
import { Download } from 'lucide-react';
import { Botao } from '../ui/Botao';
import { Campo } from '../ui/Campo';
import { Cartao } from '../ui/Cartao';
import { Titulo } from '../ui/Titulo';
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
      <Titulo subtitulo="Baixe o resumo mensal das reservas em PDF">Relatórios</Titulo>
      <Cartao className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Mês" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          <Botao icone={<Download className="h-4 w-4" aria-hidden="true" />} onClick={() => void baixar()}
            disabled={!mes} carregando={carregando} textoCarregando="Gerando...">
            Baixar PDF
          </Botao>
        </div>
      </Cartao>
      {erro && <p role="alert" className="text-sm text-erro">{erro}</p>}
    </div>
  );
}
