import { describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { criarTransacao } from '../../server/lib/db';

type Resposta = { command: string } | Error;

/** Fake de `sql` com `reserve()`: registra comandos e eventos (begin, fn, commit, release...). */
function fakeSql(respostas: Record<string, Resposta> = {}) {
  const eventos: string[] = [];
  const release = vi.fn(() => {
    eventos.push('release');
  });
  const conexao = Object.assign(
    (strings: TemplateStringsArray) => {
      const cmd = strings.join('?').trim();
      eventos.push(cmd);
      const r = respostas[cmd] ?? { command: cmd.toUpperCase() };
      return r instanceof Error ? Promise.reject(r) : Promise.resolve(Object.assign([], r));
    },
    { release },
  );
  const end = vi.fn(async () => undefined);
  const sql = { reserve: vi.fn(async () => conexao), end } as unknown as postgres.Sql;
  return { sql, eventos, release, end };
}

const erroConexao = (code: string) => Object.assign(new Error(code), { code });
const fnQueFalha = (err: Error) => async () => {
  throw err;
};

describe('criarTransacao', () => {
  it('sucesso: begin → fn → commit → release, e devolve o resultado', async () => {
    const { sql, eventos } = fakeSql();
    const r = await criarTransacao(sql)(async () => {
      eventos.push('fn');
      return 42;
    });
    expect(r).toBe(42);
    expect(eventos).toEqual(['begin', 'fn', 'commit', 'release']);
  });

  it('erro em fn: rollback + release e relança o erro original', async () => {
    const { sql, eventos } = fakeSql();
    const original = new Error('regra');
    await expect(criarTransacao(sql)(fnQueFalha(original))).rejects.toBe(original);
    expect(eventos).toEqual(['begin', 'rollback', 'release']);
  });

  it('falha no rollback (conexão viva): relança o original, não devolve a conexão e encerra o cliente', async () => {
    const { sql, eventos, release, end } = fakeSql({ rollback: new Error('rollback falhou') });
    const original = new Error('regra');
    const erroLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(criarTransacao(sql)(fnQueFalha(original))).rejects.toBe(original);
    erroLog.mockRestore();
    expect(eventos).toEqual(['begin', 'rollback']);
    expect(release).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledWith({ timeout: 0 });
  });

  it.each(['CONNECTION_CLOSED', 'CONNECTION_DESTROYED', 'CONNECTION_ENDED', 'ECONNRESET'])(
    'erro de conexão (%s) em fn: sem rollback, sem release',
    async (code) => {
      const { sql, eventos, release, end } = fakeSql();
      const original = erroConexao(code);
      await expect(criarTransacao(sql)(fnQueFalha(original))).rejects.toBe(original);
      expect(eventos).toEqual(['begin']);
      expect(release).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
    },
  );

  it('rollback com erro de conexão: relança o original, sem release e sem encerrar o cliente', async () => {
    const { sql, release, end } = fakeSql({ rollback: erroConexao('CONNECTION_CLOSED') });
    const original = new Error('regra');
    await expect(criarTransacao(sql)(fnQueFalha(original))).rejects.toBe(original);
    expect(release).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it('erro de conexão no commit: sem rollback, sem release', async () => {
    const { sql, eventos, release } = fakeSql({ commit: erroConexao('CONNECTION_CLOSED') });
    await expect(criarTransacao(sql)(async () => 1)).rejects.toMatchObject({ code: 'CONNECTION_CLOSED' });
    expect(eventos).toEqual(['begin', 'commit']);
    expect(release).not.toHaveBeenCalled();
  });

  it('commit que vira ROLLBACK (transação abortada e erro engolido em fn) → lança', async () => {
    const { sql, eventos } = fakeSql({ commit: { command: 'ROLLBACK' } });
    await expect(criarTransacao(sql)(async () => 'ok')).rejects.toThrow(/Transação abortada/);
    expect(eventos).toEqual(['begin', 'commit', 'release']);
  });
});
