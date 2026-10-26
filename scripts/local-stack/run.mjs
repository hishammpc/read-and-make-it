// Checks the app against a throwaway local copy of the database (see README.md).
//   node scripts/local-stack/run.mjs                 all suites
//   node scripts/local-stack/run.mjs staff-pages     one or more suites by name
//   node scripts/local-stack/run.mjs --keep          leave the database running afterwards
import { results, startApp, startStack, stopStack } from './harness.mjs';

process.env.TZ = 'Asia/Kuala_Lumpur';

const SUITES = ['data', 'admin-pages', 'staff-pages', 'actions'];
const args = process.argv.slice(2);
const keep = args.includes('--keep');
const picked = args.filter((a) => !a.startsWith('--'));
const unknown = picked.filter((name) => !SUITES.includes(name));
if (unknown.length > 0) {
  console.error(`Unknown suite: ${unknown.join(', ')}. Suites: ${SUITES.join(', ')}`);
  process.exit(2);
}

let stack;
let app;
let harnessError = null;
const started = performance.now(); // Date is pinned once the app loads
try {
  console.log('Starting local database (Docker)…');
  stack = await startStack();
  app = await startApp(stack.key);
  for (const name of picked.length > 0 ? picked : SUITES) {
    console.log(`\n=== ${name}`);
    const { default: suite } = await import(`./suites/${name}.mjs`);
    await suite(app);
  }
} catch (e) {
  harnessError = e;
  console.log('\nHARNESS ERROR: ' + (e?.stack ?? e));
} finally {
  await app?.vite.close();
  stack?.proxy.close();
  if (keep && stack) console.log(`\nDatabase left running: ${stack.psqlHint}  (stop: docker rm -f mlp-test-pg mlp-test-rest)`);
  else stopStack();
}

const seconds = Math.round((performance.now() - started) / 1000);
const failed = results.failed + (harnessError ? 1 : 0);
console.log(`\n${results.passed} passed, ${results.failed} failed${harnessError ? ', harness error' : ''} (${seconds}s)`);
process.exit(failed === 0 ? 0 : 1);
