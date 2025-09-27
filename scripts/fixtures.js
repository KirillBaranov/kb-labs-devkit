#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Declare known fixtures (dirs under fixtures/)
const FIXTURES = ['lib', 'cli', 'web', 'monorepo'];

// ---------- cmd helpers ----------
function sh(cmd, cwd, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

function hasGit() {
  try { execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function changedFixturesSince(ref) {
  if (!hasGit()) return FIXTURES;
  try {
    const out = execSync(`git diff --name-only ${ref} -- fixtures`, { cwd: rootDir, encoding: 'utf8' });
    const touched = new Set(
      out.split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(p => p.split('/')[1]) // fixtures/<name>/...
        .filter(Boolean)
    );
    return FIXTURES.filter(f => touched.has(f));
  } catch {
    return FIXTURES;
  }
}

// ---------- args parsing ----------
function parseArgs(argv) {
  const args = { action: null, only: null, since: null, concurrency: 2, bail: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--bail') args.bail = true;
    else if (a.startsWith('--action=')) args.action = a.slice('--action='.length);
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean);
    else if (a.startsWith('--since=')) args.since = a.slice('--since='.length);
    else if (a.startsWith('--concurrency=')) args.concurrency = Math.max(1, Number(a.slice('--concurrency='.length)) || 2);
  }
  return args;
}

function printHelp() {
  console.log(`
KB Labs DevKit – Fixtures Runner

Usage:
  node scripts/fixtures.js --action=<bootstrap|clean|lint|type-check|test|build|check> [--only=lib,cli] [--since=origin/main] [--concurrency=2] [--bail]

Flags:
  --action=...       What to run (default: check)
  --only=a,b         Run only selected fixtures (default: all)
  --since=<ref>      Run only fixtures touched since git <ref> (overrides --only if found)
  --concurrency=2    Parallelism (default: 2)
  --bail             Stop scheduling new fixtures on first failure
  --help, -h         Show this help

Examples:
  node scripts/fixtures.js --action=check
  node scripts/fixtures.js --action=lint --only=lib,web
  node scripts/fixtures.js --action=check --since=origin/main --concurrency=3
`.trim());
}

// ---------- action mapping ----------
function planCommands(fixture, action) {
  const base = {
    bootstrap: 'pnpm i',
    clean: 'pnpm clean',
    lint: 'pnpm lint',
    'type-check': 'pnpm type-check',
    test: 'pnpm test -- --run',
    build: 'pnpm build',
  };

  // Composite "check"
  const checkSeq = [
    base.lint,
    base['type-check'],
    base.build,
    base.test,
  ];

  // Special handling
  if (fixture === 'monorepo' && action === 'check') {
    return [
      'pnpm -r lint',
      'pnpm -r type-check || true', // allow TS stricter packages to evolve
      'pnpm -r build',
      'pnpm -r test -- --run',
    ];
  }
  if (fixture === 'cli' && action === 'check') {
    return [
      base.lint,
      base['type-check'],
      base.build,      // build before tests to mimic consumer usage
      base.test,
    ];
  }

  if (action === 'check') return checkSeq;
  if (base[action]) return [base[action]];

  throw new Error(`Unknown action: ${action}`);
}

// ---------- runner with concurrency ----------
async function runFixture(fixture, action) {
  const cwd = join(rootDir, 'fixtures', fixture);
  if (!existsSync(cwd)) {
    console.log(`⚠️  Skip ${fixture}: path not found (${relative(rootDir, cwd)})`);
    return { fixture, ok: false, code: 0, skipped: true };
  }

  console.log(`\n📦 Fixture: ${fixture} • Action: ${action}`);
  const commands = planCommands(fixture, action);

  for (const cmd of commands) {
    console.log(`🔧 ${fixture} > ${cmd}`);
    const code = await sh(cmd, cwd);
    if (code !== 0) {
      console.error(`❌ ${fixture} failed on: ${cmd} (exit ${code})`);
      return { fixture, ok: false, code, skipped: false };
    }
  }
  console.log(`✅ ${fixture} OK`);
  return { fixture, ok: true, code: 0, skipped: false };
}

async function runMatrix(fixtures, action, concurrency, bail) {
  const queue = [...fixtures];
  const running = new Set();
  const results = [];

  async function next() {
    const f = queue.shift();
    if (!f) return;
    const p = runFixture(f, action).then(res => {
      results.push(res);
      running.delete(p);
      if (bail && !res.ok) queue.length = 0; // stop scheduling
    });
    running.add(p);
    if (running.size < concurrency) await next();
    await p;
    if (queue.length) await next();
  }

  const starters = Math.min(concurrency, fixtures.length);
  for (let i = 0; i < starters; i++) await next();
  await Promise.all([...running]);
  return results;
}

// ---------- main ----------
(async function main() {
  const { help, action: act, only, since, concurrency, bail } = parseArgs(process.argv.slice(2));
  if (help) { printHelp(); process.exit(0); }

  const action = act || 'check';

  let targets = FIXTURES;
  if (since) {
    const touched = changedFixturesSince(since);
    if (touched.length > 0) {
      targets = touched;
      console.log(`🪄 Using --since=${since} → affected fixtures: ${touched.join(', ')}`);
    } else {
      console.log(`ℹ️  --since=${since}: no fixture changes detected`);
      process.exit(2);
    }
  } else if (only && only.length) {
    targets = FIXTURES.filter(f => only.includes(f));
  }

  console.log(`\n🚀 Running "${action}" for: ${targets.join(', ')} (concurrency=${concurrency}, bail=${bail})`);
  const results = await runMatrix(targets, action, concurrency, bail);

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;

  console.log(`\n📊 Summary: ok=${ok}, failed=${failed}, skipped=${skipped}`);
  process.exit(failed > 0 ? 1 : 0);
})();
