import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatInTimeZone } from 'date-fns-tz';
import { FUSO, type StatusFiltro } from '../../shared/constantes';
import type { RelatorioMensalDTO } from '../../shared/tipos';
import { ROTULO_STATUS } from '../rotulos';

const ORDEM: StatusFiltro[] = ['pendente', 'expirada', 'aprovada', 'recusada', 'cancelada'];

export function gerarPdfMensal(dados: RelatorioMensalDTO): jsPDF {
  const [ano, mes] = dados.mes.split('-');
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Relatório de reservas — ${mes}/${ano}`, 14, 18);
  doc.setFontSize(10);
  const totais = ORDEM.map((s) => `${ROTULO_STATUS[s]}: ${dados.totais[s]}`).join('  |  ');
  doc.text(`Total: ${dados.reservas.length}  |  ${totais}`, 14, 26);

  const fmt = (iso: string, f: string) => formatInTimeZone(new Date(iso), FUSO, f);
  autoTable(doc, {
    startY: 32,
    head: [['Data', 'Horário', 'Sala', 'Solicitante', 'Finalidade', 'Situação']],
    body: dados.reservas.map((r) => [
      fmt(r.inicio, 'dd/MM/yyyy'),
      `${fmt(r.inicio, 'HH:mm')}–${fmt(r.fim, 'HH:mm')}`,
      r.salaNome,
      r.solicitanteNome,
      r.finalidade,
      ROTULO_STATUS[r.expirada ? 'expirada' : r.status],
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [51, 65, 85] },
  });
  return doc;
}
