import { z } from 'zod';
import {
  FINALIDADE_MAX, JANELA_MAXIMA_DIAS, PAPEIS, STATUS_FILTRO, TIPOS_SALA,
} from './constantes';
import type { StatusFiltro } from './constantes';

const texto = (msg: string) => z.string().trim().min(1, msg);
const email = z.string().trim().toLowerCase().email('E-mail inválido.');
const senha = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.');
const data = z.string().datetime({ offset: true, message: 'Data e hora inválidas.' });
const finalidade = texto('Informe a finalidade.').max(
  FINALIDADE_MAX,
  `A finalidade deve ter no máximo ${FINALIDADE_MAX} caracteres.`,
);

export const esquemaUuid = z.string().uuid('Identificador inválido.');

export const esquemaCriarReserva = z.object({
  salaId: esquemaUuid,
  inicio: data,
  fim: data,
  finalidade,
});

export const esquemaRecusar = z.object({ motivo: texto('Informe o motivo da recusa.') });

export const esquemaSala = z.object({
  nome: texto('Informe o nome da sala.'),
  tipo: z.enum(TIPOS_SALA, { errorMap: () => ({ message: 'Tipo de sala inválido.' }) }),
  capacidade: z
    .number({ invalid_type_error: 'A capacidade deve ser um número inteiro maior que zero.' })
    .int('A capacidade deve ser um número inteiro maior que zero.')
    .positive('A capacidade deve ser um número inteiro maior que zero.'),
  recursos: z.array(z.string().trim().min(1)),
});

export const esquemaEditarSala = esquemaSala.partial();

const papel = z.enum(PAPEIS, { errorMap: () => ({ message: 'Perfil inválido.' }) });

export const esquemaCriarUsuario = z.object({
  nome: texto('Informe o nome.'),
  email,
  senha,
  papel,
});

export const esquemaEditarUsuario = z.object({
  nome: texto('Informe o nome.').optional(),
  email: email.optional(),
  papel: papel.optional(),
  novaSenha: senha.optional(),
});

const MS_DIA = 24 * 60 * 60 * 1000;

export const esquemaListarReservas = z
  .object({
    inicio: data,
    fim: data,
    salaId: esquemaUuid.optional(),
    tipo: z.enum(TIPOS_SALA, { errorMap: () => ({ message: 'Tipo de sala inválido.' }) }).optional(),
    status: z
      .string()
      .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
      .pipe(z.array(z.enum(STATUS_FILTRO, { errorMap: () => ({ message: 'Status inválido.' }) })))
      .transform((s) => s as StatusFiltro[])
      .optional(),
    minhas: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  })
  .superRefine((v, ctx) => {
    const ini = new Date(v.inicio).getTime();
    const fim = new Date(v.fim).getTime();
    if (fim <= ini) {
      ctx.addIssue({ code: 'custom', path: ['fim'], message: 'O fim deve ser depois do início.' });
    } else if (fim - ini > JANELA_MAXIMA_DIAS * MS_DIA) {
      ctx.addIssue({
        code: 'custom',
        path: ['fim'],
        message: `O período consultado deve ter no máximo ${JANELA_MAXIMA_DIAS} dias.`,
      });
    }
  });

export const esquemaMes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.');

export type DadosCriarReserva = z.infer<typeof esquemaCriarReserva>;
export type DadosSala = z.infer<typeof esquemaSala>;
export type DadosCriarUsuario = z.infer<typeof esquemaCriarUsuario>;
export type DadosEditarUsuario = z.infer<typeof esquemaEditarUsuario>;
export type FiltroReservas = z.infer<typeof esquemaListarReservas>;
