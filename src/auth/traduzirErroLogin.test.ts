import { describe, expect, it } from 'vitest';
import { traduzirErroLogin } from './traduzirErroLogin';

describe('traduzirErroLogin', () => {
  it('traduz credenciais inválidas', () => {
    expect(traduzirErroLogin('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
  });
  it('traduz usuário banido', () => {
    expect(traduzirErroLogin('User is banned')).toBe('Usuário inativo. Procure a direção.');
  });
  it('usa mensagem genérica para outros erros', () => {
    expect(traduzirErroLogin('qualquer coisa')).toBe('Não foi possível entrar. Tente novamente.');
  });
});
