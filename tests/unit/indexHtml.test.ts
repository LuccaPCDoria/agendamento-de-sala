import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('index.html', () => {
  it('script pré-pintura usa a mesma chave e o mesmo media query', () => {
    const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain('agendamento:tema');
    expect(html).toContain('(prefers-color-scheme: dark)');
  });
});
