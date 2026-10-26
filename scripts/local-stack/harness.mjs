// A throwaway copy of the database in Docker, and the app's own code pointed at it.
// Postgres + PostgREST, the repo's migrations, fake staff (sql/seed.sql). Never touches MPC's live project.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT = path.resolve(HERE, '../..');

const NETWORK = 'mlp-test';
const PG = 'mlp-test-pg';
const REST = 'mlp-test-rest';
const PG_PORT = 55432;
const REST_PORT = 53000;
const PROXY_PORT = 53100;
export const LOCAL_URL = `http://127.0.0.1:${PROXY_PORT}`;
// Only ever used by the local PostgREST container
const JWT_SECRET = 'local-test-secret-not-a-real-key-0123456789abcdef';

// The seed is written for this date; pinning "now" keeps its answers right in later years
export const PINNED_NOW = '2026-10-26T10:00:00+08:00';

// The vault extension only exists on Supabase; nothing the app uses needs it
const EXPECTED_BASELINE_ERRORS = [/extension "supabase_vault" is not available/];

const docker = (...args) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

function psql(input, { stopOnError = true } = {}) {
  const r = spawnSync('docker', ['exec', '-i', PG, 'psql', '-U', 'postgres', '-X', '-q', '-At', '-v', `ON_ERROR_STOP=${stopOnError ? 1 : 0}`], { input });
  return { status: r.status, out: r.stdout.toString().trim(), err: r.stderr.toString() };
}

/** Runs one SQL statement against the local copy and returns its output. */
export function sql(query) {
  const r = psql(query);
  if (r.status !== 0) throw new Error(r.err.trim());
  return r.out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(what, ready, seconds = 60) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await ready().catch(() => false)) return;
    await sleep(500);
  }
  throw new Error(`${what} did not start within ${seconds}s`);
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
async function anonKey() {
  const { createHmac } = await import('node:crypto');
  const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ role: 'anon', iss: 'local-stack' })}`;
  return `${unsigned}.${createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url')}`;
}

function loadSqlFile(file, { allowedErrors = [] } = {}) {
  const r = psql(fs.readFileSync(file, 'utf8'), { stopOnError: allowedErrors.length === 0 });
  const errors = r.err.split('\n').filter((line) => /ERROR/.test(line));
  const unexpected = errors.filter((line) => !allowedErrors.some((pattern) => pattern.test(line)));
  if (r.status !== 0 || unexpected.length > 0) {
    throw new Error(`${path.relative(PROJECT, file)} failed:\n${(unexpected.length ? unexpected : [r.err]).join('\n')}`);
  }
}

export function stopStack() {
  spawnSync('docker', ['rm', '-f', PG, REST], { stdio: 'ignore' });
  spawnSync('docker', ['network', 'rm', NETWORK], { stdio: 'ignore' });
}

/** Fresh Postgres + PostgREST with every migration and the fake staff, plus the /rest/v1 proxy. */
export async function startStack() {
  try {
    docker('info', '--format', '{{.ServerVersion}}');
  } catch {
    throw new Error('Docker is not running. Start Docker Desktop and try again.');
  }
  stopStack();
  docker('network', 'create', NETWORK);
  docker('run', '-d', '--name', PG, '--network', NETWORK, '-e', 'POSTGRES_PASSWORD=pg', '-p', `127.0.0.1:${PG_PORT}:5432`, 'postgres:15-alpine');
  // Over TCP: the image's first-boot init server listens on the socket only, then restarts
  await waitFor('Postgres', async () => spawnSync('docker', ['exec', PG, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']).status === 0);

  loadSqlFile(path.join(HERE, 'sql/supabase-stubs.sql'));
  const migrations = fs.readdirSync(path.join(PROJECT, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const [i, name] of migrations.entries()) {
    loadSqlFile(path.join(PROJECT, 'supabase/migrations', name), { allowedErrors: i === 0 ? EXPECTED_BASELINE_ERRORS : [] });
  }
  loadSqlFile(path.join(HERE, 'sql/seed.sql'));

  const key = await anonKey();
  docker(
    'run', '-d', '--name', REST, '--network', NETWORK,
    '-e', `PGRST_DB_URI=postgres://authenticator:auth@${PG}:5432/postgres`,
    '-e', 'PGRST_DB_SCHEMAS=public',
    '-e', 'PGRST_DB_ANON_ROLE=anon',
    '-e', `PGRST_JWT_SECRET=${JWT_SECRET}`,
    // Same row cap as Supabase, so paging bugs show up here too
    '-e', 'PGRST_DB_MAX_ROWS=1000',
    '-p', `127.0.0.1:${REST_PORT}:3000`,
    'postgrest/postgrest:v12.2.3'
  );
  await waitFor('PostgREST', async () => {
    const res = await fetch(`http://127.0.0.1:${REST_PORT}/profiles?select=id&limit=1`, { headers: { Authorization: `Bearer ${key}` } });
    return res.ok;
  });

  // supabase-js calls <url>/rest/v1/<table>; standalone PostgREST serves /<table>
  const proxy = http.createServer((req, res) => {
    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: REST_PORT,
        path: req.url.replace(/^\/rest\/v1/, ''),
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${REST_PORT}` },
      },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      }
    );
    req.pipe(upstream);
  });
  await new Promise((resolve) => proxy.listen(PROXY_PORT, '127.0.0.1', resolve));
  return { key, proxy, psqlHint: `PGPASSWORD=pg psql -h 127.0.0.1 -p ${PG_PORT} -U postgres` };
}

function pinClock(iso) {
  const RealDate = Date;
  const offset = RealDate.parse(iso) - RealDate.now();
  // Keeps ticking from the pinned moment, so timeouts and elapsed-time code still work
  globalThis.Date = class PinnedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...args);
    }
    static now() {
      return RealDate.now() + offset;
    }
  };
}

function browserPolyfills() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  // parseUserCSV reads uploads with FileReader
  globalThis.FileReader = class {
    readAsText(file) {
      file.text().then((result) => this.onload?.({ target: { result } }), (e) => this.onerror?.(e));
    }
  };
  // Expected when rendering on the server (Radix, react-router); it would bury the results
  const consoleError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('useLayoutEffect does nothing on the server')) return;
    consoleError(...args);
  };
}

/** Loads the app through Vite with the Supabase URL pointed at the local proxy. */
export async function startApp(key) {
  // Real env vars win over .env / .env.local, so the live URL never gets in
  process.env.VITE_SUPABASE_URL = LOCAL_URL;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = key;
  browserPolyfills();
  pinClock(PINNED_NOW);

  const stub = (name) => path.join(HERE, 'stubs', name);
  const vite = await createServer({
    root: PROJECT,
    configFile: path.join(PROJECT, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    plugins: [
      {
        name: 'local-stack-stubs',
        enforce: 'pre',
        // The '@' alias may already be applied, so match the resolved path too
        resolveId(id) {
          if (/(^@|\/src)\/components\/layout\/AdminLayout(\.tsx)?$/.test(id)) return stub('AdminLayout.tsx');
          if (/(^@|\/src)\/contexts\/AuthContext(\.tsx)?$/.test(id)) return stub('AuthContext.tsx');
        },
      },
    ],
  });
  const load = (p) => vite.ssrLoadModule(p);

  const { supabase } = await load('/src/integrations/supabase/client.ts');
  // Guard: everything below talks to the local copy, never the live project
  assert.equal(supabase.supabaseUrl, LOCAL_URL, 'Supabase client is not pointed at the local stack');
  const E = await load('/scripts/local-stack/entry.tsx');

  const page = async (Page, pattern, url) => {
    const { html, errors } = await E.renderSettled(Page, pattern, url);
    assert.deepEqual(errors, [], 'query errors');
    return html;
  };
  const row = async (table, col, value, cols = 'id') => {
    const { data, error } = await supabase.from(table).select(cols).eq(col, value).single();
    if (error) throw error;
    return data;
  };
  const setUser = (profile, role = 'employee') => {
    globalThis.__HARNESS_USER__ = profile && { userId: profile.id, email: profile.email, name: profile.name, role };
  };
  return { vite, load, supabase, E, pages: E.pages, page, row, setUser, sql };
}

export const results = { passed: 0, failed: 0 };

export async function check(name, fn) {
  try {
    await fn();
    results.passed++;
    console.log('  ok   ' + name);
  } catch (e) {
    results.failed++;
    const detail = String(e?.message ?? e).split('Input:')[0].slice(0, 400);
    const actual = e?.actual !== undefined ? '\n       actual: ' + String(e.actual).slice(0, 400) : '';
    console.log('  FAIL ' + name + '\n       ' + detail + actual);
  }
}

// React's SSR text separators (<!-- -->) are not spaces
export const text = (html) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');

export const tableRows = (html) =>
  [...html.matchAll(/<tbody[^>]*>([\s\S]*?)<\/tbody>/g)].flatMap((m) =>
    [...m[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => text(r[1]).trim())
  );
