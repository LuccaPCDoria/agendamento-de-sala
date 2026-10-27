import { describe, expect, it } from 'vitest';
import { limitesDoMes } from '../../server/lib/datas';

describe('limitesDoMes', () => {
  it('novembro/2026', () =>
    expect(limitesDoMes('2026-11')).toEqual({ inicio: new Date('2026-11-01T03:00:00Z'), fim: new Date('2026-12-01T03:00:00Z') }));
  it('dezembro vira janeiro do ano seguinte', () =>
    expect(limitesDoMes('2026-12').fim).toEqual(new Date('2027-01-01T03:00:00Z')));
});
