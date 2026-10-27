import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Papel } from '../../shared/constantes';
import type { Perfil, Sala } from '../../shared/tipos';
import { readFileSync } from 'node:fs';
import { criarRepos, criarSql, criarTransacao } from '../../server/lib/db';
import { criarAuthAdmin } from '../../server/lib/supabaseAdmin';
import { notificadorNulo } from '../../server/lib/notificador';
import type { DependenciasApp } from '../../server/dependencias';

function env(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável ${nome} ausente (.env.test)`);
  return v;
}

/** Valores do .env de produção (se existir), sem imprimir nada. */
function lerEnvProducao(): Record<string, string> {
  const r: Record<string, string> = {};
  try {
    for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?(DATABASE_URL|SUPABASE_URL)\s*=\s*(.*?)\s*$/.exec(linha);
      if (m) r[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {
    /* sem .env */
  }
  return r;
}

function refDoBanco(url: string | undefined): string | null {
  if (!url) return null;
  const usuario = /^[a-z]+:\/\/([^:@/]+)/i.exec(url)?.[1] ?? '';
  const doUsuario = /^[^.]+\.([a-z0-9]+)$/i.exec(usuario)?.[1]; // pooler: postgres.<ref>
  if (doUsuario) return doUsuario;
  return /@db\.([a-z0-9]+)\./i.exec(url)?.[1] ?? null;
}

function garantirAlvoNaoProducao(): void {
  const prod = lerEnvProducao();
  const mesmoSupabase = !!prod.SUPABASE_URL && env('TEST_SUPABASE_URL') === prod.SUPABASE_URL;
  const refProd = refDoBanco(prod.DATABASE_URL);
  const mesmoBanco = !!refProd && refDoBanco(env('TEST_DATABASE_URL')) === refProd;
  if (mesmoSupabase || mesmoBanco) {
    throw new Error('TEST_* aponta para o mesmo projeto de produção — abortando');
  }
}

garantirAlvoNaoProducao();

export const sqlTeste = criarSql(env('TEST_DATABASE_URL'));

export function novoClienteSql(): postgres.Sql {
  return criarSql(env('TEST_DATABASE_URL'));
}

const admin = createClient(env('TEST_SUPABASE_URL'), env('TEST_SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(env('TEST_SUPABASE_URL'), env('TEST_SUPABASE_ANON_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function limparBanco(): Promise<void> {
  await sqlTeste`delete from historico_reservas`;
  await sqlTeste`delete from reservas`;
  await sqlTeste`delete from salas`;
  const removidos = await sqlTeste<{ id: string }[]>`
    delete from perfis where email like '%@teste.local' returning id`;
  const ids = new Set(removidos.map((r) => r.id));
  // Contas do Auth de teste, inclusive órfãs sem perfil.
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email?.endsWith('@teste.local')) ids.add(u.id);
    if (data.users.length < 200) break;
  }
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
}

export async function criarSalaTeste(nome = `Sala ${randomUUID().slice(0, 8)}`): Promise<Sala> {
  const [sala] = await sqlTeste<Sala[]>`
    insert into salas (nome, tipo, capacidade, recursos)
    values (${nome}, 'reuniao', 10, ${['projetor']})
    returning id, nome, tipo, capacidade, recursos, ativa`;
  return sala;
}

export async function criarUsuarioTeste(papel: Papel): Promise<{ perfil: Perfil; token: string }> {
  const email = `${randomUUID()}@teste.local`;
  const senha = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('Falha ao criar usuário no Auth');
  const [perfil] = await sqlTeste<Perfil[]>`
    insert into perfis (id, nome, email, papel)
    values (${data.user.id}, ${'Teste ' + papel}, ${email}, ${papel})
    returning id, nome, email, papel, ativo`;
  const { data: sessao, error: erroLogin } = await anon.auth.signInWithPassword({ email, password: senha });
  if (erroLogin || !sessao.session) throw erroLogin ?? new Error('Falha no login de teste');
  return { perfil, token: sessao.session.access_token };
}

let sqlDeps: postgres.Sql | undefined;

export async function encerrarConexoes(): Promise<void> {
  await sqlTeste.end();
  if (sqlDeps) await sqlDeps.end();
  sqlDeps = undefined;
}

export function depsIntegracao(): DependenciasApp {
  const sql = (sqlDeps ??= criarSql(env('TEST_DATABASE_URL')));
  const { authAdmin, verificarToken } = criarAuthAdmin(
    env('TEST_SUPABASE_URL'),
    env('TEST_SUPABASE_SERVICE_ROLE_KEY'),
  );
  return {
    verificarToken,
    repos: criarRepos(sql),
    transacao: criarTransacao(sql),
    authAdmin,
    notificar: notificadorNulo,
    agora: () => new Date(),
  };
}
