// Public API: sync runner used by bin and by consumers via import('@kb-labs/devkit/sync')
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, stat, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEVKIT_ROOT = resolve(__dirname, '..'); // .../devkit

// Map of sync targets shipped with DevKit
const MAP = {
  agents: {
    from: resolve(DEVKIT_ROOT, 'agents'),
    to: (root) => resolve(root, 'kb-labs/agents'),
    type: 'dir',
  },
  cursorrules: {
    from: resolve(DEVKIT_ROOT, '.cursorrules'),
    to: (root) => resolve(root, '.cursorrules'),
    type: 'file',
  },
  vscode: {
    from: resolve(DEVKIT_ROOT, '.vscode/settings.json'),
    to: (root) => resolve(root, '.vscode/settings.json'),
    type: 'file',
  },
};

const log = (...a) => console.log('[devkit-sync]', ...a);
const warn = (...a) => console.warn('[devkit-sync]', ...a);

async function exists(p) { try { await access(p); return true; } catch { return false; } }
async function ensureDirForFile(p) { await mkdir(dirname(p), { recursive: true }); }

async function sha256File(p) {
  const buf = await readFile(p);
  return createHash('sha256').update(buf).digest('hex');
}

async function listFilesRec(root) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p); else out.push(p);
    }
  }
  await walk(root);
  return out;
}

async function comparePaths(src, dst, type) {
  const diffs = [];
  const onlySrc = [];
  const onlyDst = [];

  if (type === 'file') {
    const srcOk = await exists(src);
    const dstOk = await exists(dst);
    if (!srcOk && !dstOk) return { diffs, onlySrc, onlyDst };
    if (srcOk && !dstOk) { onlySrc.push(dst); return { diffs, onlySrc, onlyDst }; }
    if (!srcOk && dstOk) { onlyDst.push(dst); return { diffs, onlySrc, onlyDst }; }
    const [a, b] = await Promise.all([sha256File(src), sha256File(dst)]);
    if (a !== b) diffs.push(dst);
    return { diffs, onlySrc, onlyDst };
  }

  const srcOk = await exists(src);
  const dstOk = await exists(dst);
  if (!srcOk && !dstOk) return { diffs, onlySrc, onlyDst };
  if (srcOk && !dstOk) {
    const files = await listFilesRec(src);
    onlySrc.push(...files.map(f => f.replace(src, dst)));
    return { diffs, onlySrc, onlyDst };
  }
  if (!srcOk && dstOk) {
    const files = await listFilesRec(dst);
    onlyDst.push(...files);
    return { diffs, onlySrc, onlyDst };
  }

  const srcFiles = await listFilesRec(src);
  const dstFiles = await listFilesRec(dst);
  const srcRel = new Map(srcFiles.map(p => [p.slice(src.length + 1), p]));
  const dstRel = new Map(dstFiles.map(p => [p.slice(dst.length + 1), p]));

  for (const [rel, pSrc] of srcRel) {
    const pDst = dstRel.get(rel);
    if (!pDst) { onlySrc.push(join(dst, rel)); continue; }
    const [a, b] = await Promise.all([sha256File(pSrc), sha256File(pDst)]);
    if (a !== b) diffs.push(pDst);
  }
  for (const [rel, pDst] of dstRel) {
    if (!srcRel.has(rel)) onlyDst.push(pDst);
  }
  return { diffs, onlySrc, onlyDst };
}

function parseArgs(argv) {
  const args = [...argv];
  const flags = new Set();
  const kv = new Map();
  const positional = [];

  for (const a of args) {
    if (a === '--') break;
    if (a.startsWith('--')) {
      const [k, v] = a.split('=', 2);
      if (v === undefined) flags.add(k);
      else kv.set(k, v);
    } else {
      positional.push(a);
    }
  }

  const help = flags.has('--help') || flags.has('-h');
  const version = flags.has('--version') || flags.has('-v');
  const check = flags.has('--check');
  const force = flags.has('--force');
  const verbose = flags.has('--verbose');
  const timeoutMs = Number(kv.get('--timeout') ?? process.env.KB_DEVKIT_SYNC_TIMEOUT_MS ?? 30000);
  const onlyList = kv.get('--only')?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  return { help, version, check, force, verbose, timeoutMs, onlyList, positional };
}

async function readProjectConfig(root) {
  const p = resolve(root, 'kb-labs.config.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return {}; }
}

function resolveTargets({ onlyList, positional, disabledSet }) {
  const all = Object.keys(MAP).filter(k => !disabledSet.has(k));
  if (onlyList.length === 0 && positional.length === 0) return all;
  const requested = [...onlyList, ...positional].filter(Boolean);
  return requested.filter(k => MAP[k] && !disabledSet.has(k));
}

async function writeProvenance(root) {
  let meta = null;
  try {
    const pkgJson = JSON.parse(await readFile(resolve(DEVKIT_ROOT, 'package.json'), 'utf8'));
    meta = { name: pkgJson.name, version: pkgJson.version ?? null, description: pkgJson.description ?? null };
  } catch { }
  await mkdir(resolve(root, 'kb-labs'), { recursive: true });
  await writeFile(
    resolve(root, 'kb-labs/DEVKIT_SYNC.json'),
    JSON.stringify({ source: meta?.name ?? '@kb-labs/devkit', version: meta?.version ?? null, when: new Date().toISOString() }, null, 2)
  );
}

async function runCheck(root, targets, verbose) {
  const summary = { ok: 0, drift: 0 };
  for (const key of targets) {
    const { from, to, type } = MAP[key];
    const dst = to(root);
    const res = await comparePaths(from, dst, type);
    const changed = (res.diffs.length + res.onlySrc.length + res.onlyDst.length) > 0;
    if (changed) {
      summary.drift++;
      log(`drift ${key}:`, JSON.stringify(res, null, 2));
    } else {
      summary.ok++;
      if (verbose) log(`ok ${key}: no drift`);
    }
  }
  log('check done', summary);
  return summary.drift > 0 ? 2 : 0;
}

async function runSync(root, targets, force, verbose) {
  const summary = { synced: 0, kept: 0, skipped: 0 };
  for (const key of targets) {
    const { from, to, type } = MAP[key];
    const dst = to(root);
    const srcOk = await exists(from);
    if (!srcOk) {
      summary.skipped++;
      warn(`skip ${key} — source not found: ${from}`);
      continue;
    }
    if (!force && await exists(dst)) {
      summary.kept++;
      if (verbose) log(`keep ${key} — exists: ${dst}`);
      continue;
    }
    if (type === 'file') await ensureDirForFile(dst);
    else await mkdir(dst, { recursive: true });
    await cp(from, dst, { recursive: true, force: true });
    summary.synced++;
    log(`synced ${key} -> ${dst}`);
  }
  await writeProvenance(root);
  log('sync done', summary, `(force=${force})`);
  return 0;
}

function printHelp() {
  const keys = Object.keys(MAP).join(', ');
  console.log(`kb-devkit-sync
Synchronize DevKit assets into a consumer repository.

Usage:
  kb-devkit-sync [--check] [--force] [--verbose] [--timeout=ms] [--only=a,b] [targets...]

Targets:
  ${keys}

Flags:
  --help, -h        Show this help and exit
  --version, -v     Print devkit version and exit
  --check           Compare and exit with 0 (no drift) or 2 (drift found)
  --force           Overwrite destination files/directories
  --verbose         Print per-target details
  --timeout=ms      Optional timeout guard (default 30000)
  --only=a,b        Limit sync/check to specific targets
`);
}

async function printVersion() {
  try {
    const pkgJson = JSON.parse(await readFile(resolve(DEVKIT_ROOT, 'package.json'), 'utf8'));
    console.log(pkgJson.version ?? 'unknown');
  } catch {
    console.log('unknown');
  }
}

export async function run({ args = [] } = {}) {
  const { help, version, check, force, verbose, timeoutMs, onlyList, positional } = parseArgs(args);
  const root = process.cwd();
  const cfg = await readProjectConfig(root);
  const disabledSet = new Set(cfg?.sync?.disabled ?? []);
  const targets = resolveTargets({ onlyList, positional, disabledSet });

  if (help) { printHelp(); return 0; }
  if (version) { await printVersion(); return 0; }

  const controller = new AbortController();
  const t = setTimeout(() => { controller.abort(); }, Math.max(0, timeoutMs));

  try {
    if (check) {
      return await runCheck(root, targets, verbose);
    } else {
      return await runSync(root, targets, force || !!cfg?.sync?.force, verbose);
    }
  } finally {
    clearTimeout(t);
  }
}
