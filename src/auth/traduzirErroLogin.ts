export function traduzirErroLogin(mensagem: string): string {
  if (mensagem.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (mensagem.toLowerCase().includes('banned')) return 'Usuário inativo. Procure a direção.';
  return 'Não foi possível entrar. Tente novamente.';
}
