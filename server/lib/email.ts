import nodemailer, { type Transporter } from 'nodemailer';
import { formatInTimeZone } from 'date-fns-tz';
import { FUSO } from '../../shared/constantes';
import type { EventoEmail, Notificador, TipoEmail } from './notificador';

const ASSUNTOS: Record<TipoEmail, string> = {
  criada: 'Solicitação de reserva recebida',
  confirmada: 'Reserva confirmada',
  aprovada: 'Reserva aprovada',
  recusada: 'Reserva recusada',
  cancelada: 'Reserva cancelada',
};

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function montarEmail(e: EventoEmail, appUrl: string): { assunto: string; html: string; texto: string } {
  const assunto = ASSUNTOS[e.tipo];
  const linhas = e.reservas.map((r) => ({
    sala: r.salaNome,
    data: formatInTimeZone(r.inicio, FUSO, 'dd/MM/yyyy'),
    horario: `${formatInTimeZone(r.inicio, FUSO, 'HH:mm')}–${formatInTimeZone(r.fim, FUSO, 'HH:mm')}`,
    finalidade: r.finalidade,
    motivo: r.motivoRecusa,
  }));
  const texto = [
    `Olá, ${e.nome}!`,
    '',
    `${assunto}:`,
    ...linhas.map(
      (l) =>
        `- ${l.sala}, ${l.data}, ${l.horario} — ${l.finalidade}` + (l.motivo ? ` (Motivo da recusa: ${l.motivo})` : ''),
    ),
    '',
    `Acesse: ${appUrl}`,
  ].join('\n');
  const html = [
    `<p>Olá, ${escaparHtml(e.nome)}!</p>`,
    `<p>${escaparHtml(assunto)}:</p>`,
    '<ul>',
    ...linhas.map(
      (l) =>
        `<li>${escaparHtml(l.sala)}, ${l.data}, ${l.horario} — ${escaparHtml(l.finalidade)}` +
        (l.motivo ? `<br><em>Motivo da recusa:</em> ${escaparHtml(l.motivo)}` : '') +
        '</li>',
    ),
    '</ul>',
    `<p><a href="${escaparHtml(appUrl)}">Acessar o sistema</a></p>`,
  ].join('\n');
  return { assunto, html, texto };
}

export function criarNotificador(cfg: {
  usuario: string;
  senha: string;
  appUrl: string;
  prazoMs?: number;
  criarTransporte?: () => Pick<Transporter, 'sendMail' | 'close'>;
}): Notificador {
  const prazoMs = cfg.prazoMs ?? 5000;
  return async (eventos) => {
    if (eventos.length === 0) return;
    let transporte: Pick<Transporter, 'sendMail' | 'close'> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      transporte = cfg.criarTransporte
        ? cfg.criarTransporte()
        : nodemailer.createTransport({
            service: 'gmail',
            pool: true,
            maxConnections: 2,
            auth: { user: cfg.usuario, pass: cfg.senha },
          });
      const t = transporte;
      const envio = Promise.allSettled(
        eventos.map((e) => {
          const { assunto, html, texto } = montarEmail(e, cfg.appUrl);
          return t.sendMail({ from: cfg.usuario, to: e.para, subject: assunto, html, text: texto });
        }),
      ).then((resultados) => {
        for (const res of resultados)
          if (res.status === 'rejected')
            console.error('Falha ao enviar e-mail:', res.reason instanceof Error ? res.reason.message : 'erro desconhecido');
      });
      const prazo = new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          console.error(`Envio de e-mails excedeu o prazo de ${prazoMs} ms`);
          resolve();
        }, prazoMs);
      });
      await Promise.race([envio, prazo]);
    } catch (err) {
      console.error('Falha ao notificar por e-mail:', err instanceof Error ? err.message : 'erro desconhecido');
    } finally {
      if (timer) clearTimeout(timer);
      try {
        transporte?.close();
      } catch {
        /* ignora */
      }
    }
  };
}
