export class ErroApp extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ErroApp';
  }
}

export const invalido = (msg: string) => new ErroApp(400, msg);
export const proibido = () => new ErroApp(403, 'Você não tem permissão para esta ação.');
export const naoEncontrado = (msg: string) => new ErroApp(404, msg);
export const conflito = (msg: string) => new ErroApp(409, msg);
