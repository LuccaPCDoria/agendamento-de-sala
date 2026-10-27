import { describe, expect, it } from 'vitest';
import { criarSql } from '../../server/lib/db';

describe('criarSql', () => {
  it('não faz pipelining de consultas (o pooler de transação do Supabase perde respostas pipelined)', async () => {
    const sql = criarSql('postgres://u:p@localhost:6543/db');
    try {
      expect(sql.options.max).toBe(1);
      expect(sql.options.prepare).toBe(false);
      expect((sql.options as unknown as { max_pipeline: number }).max_pipeline).toBe(0);
    } finally {
      await sql.end({ timeout: 0 });
    }
  });
});
