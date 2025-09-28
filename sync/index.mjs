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
const BASE_MAP = {
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
  ci: {
    from: resolve(DEVKIT_ROOT, '.github/workflow-templates'),
    to: (root) => resolve(root, '.github/workflows'),
    type: 'dir',
  }
};

function resolveFromDevkit(p) {
  // absolute path stays absolute; otherwise resolve from DEVKIT_ROOT
  return p && p.startsWith('/') ? p : resolve(DEVKIT_ROOT, p);
}

function buildEffectiveMap(projectCfg) {
  // shallow clone of BASE_MAP with functions preserved
  const map = Object.fromEntries(Object.entries(BASE_MAP).map(([k, v]) => [k, { ...v }]));
  const syncCfg = projectCfg?.sync || {};

  // overrides: { targetKey: { from, to, type } }
  if (syncCfg.overrides && typeof syncCfg.overrides === 'object') {
    for (const [key, ov] of Object.entries(syncCfg.overrides)) {
      if (!map[key]) continue; // ignore unknown keys
      if (ov.from) map[key].from = resolveFromDevkit(String(ov.from));
      if (ov.to) map[key].to = (root) => resolve(root, String(ov.to));
      if (ov.type) map[key].type = String(ov.type);
    }
  }

  // extra targets: { key: { from, to, type } }
  if (syncCfg.targets && typeof syncCfg.targets === 'object') {
    for (const [key, t] of Object.entries(syncCfg.targets)) {
      if (!t?.from || !t?.to) continue; // must have both
      map[key] = {
        from: resolveFromDevkit(String(t.from)),
        to: (root) => resolve(root, String(t.to)),
        type: String(t.type || 'dir'),
      };
    }
  }
  return map;
}

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
  const json = flags.has('--json');
  const dryRun = flags.has('--dry-run');
  const ciOnly = flags.has('--ci-only');
  const list = flags.has('--list');
  const timeoutMs = Number(kv.get('--timeout') ?? process.env.KB_DEVKIT_SYNC_TIMEOUT_MS ?? 30000);
  const onlyList = kv.get('--only')?.split(',').map(s => s.trim()).filter(Boolean) ?? [];

  // scope: managed-only (default) | strict | all
  const scopeRaw = (kv.get('--scope') ?? process.env.KB_DEVKIT_SYNC_SCOPE ?? '').toString();
  const scope = ['managed-only', 'strict', 'all'].includes(scopeRaw) ? scopeRaw : 'managed-only';

  return { help, version, check, force, verbose, json, dryRun, ciOnly, list, timeoutMs, onlyList, positional, scope };
}

async function readProjectConfig(root) {
  const p = resolve(root, 'kb-labs.config.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return {}; }
}

function resolveTargets(effectiveMap, { onlyList, positional, disabledSet }) {
  const all = Object.keys(effectiveMap).filter(k => !disabledSet.has(k));
  if (onlyList.length === 0 && positional.length === 0) return all;
  const requested = [...onlyList, ...positional].filter(Boolean);
  return requested.filter(k => effectiveMap[k] && !disabledSet.has(k));
}

async function writeProvenance(root, { items = [], scope = 'managed-only' } = {}) {
  let meta = null;
  try {
    const pkgJson = JSON.parse(await readFile(resolve(DEVKIT_ROOT, 'package.json'), 'utf8'));
    meta = { name: pkgJson.name, version: pkgJson.version ?? null, description: pkgJson.description ?? null };
  } catch { }
  await mkdir(resolve(root, 'kb-labs'), { recursive: true });
  const payload = {
    source: meta?.name ?? '@kb-labs/devkit',
    version: meta?.version ?? null,
    when: new Date().toISOString(),
    scope,
    items,
  };
  await writeFile(resolve(root, 'kb-labs/DEVKIT_SYNC.json'), JSON.stringify(payload, null, 2));
}

async function runCheck(root, effectiveMap, targets, { verbose, scope }) {
  const details = [];
  const summary = { ok: 0, drift: 0 };
  const considerOnlyDst = scope !== 'managed-only';

  for (const key of targets) {
    const { from, to, type } = effectiveMap[key];
    const dst = to(root);
    const res = await comparePaths(from, dst, type);

    const changed = (res.diffs.length + res.onlySrc.length + (considerOnlyDst ? res.onlyDst.length : 0)) > 0;
    const item = {
      key,
      type,
      dst,
      diffs: res.diffs,
      onlySrc: res.onlySrc,
      onlyDst: considerOnlyDst ? res.onlyDst : [],
    };
    if (!considerOnlyDst && res.onlyDst.length) {
      item.ignored = { onlyDst: res.onlyDst.length };
    }

    details.push(item);
    if (changed) {
      summary.drift++;
      log(`drift ${key}:`, JSON.stringify(item, null, 2));
    } else {
      summary.ok++;
      if (verbose) log(`ok ${key}: no drift`);
    }
  }
  log('check done', summary);
  return { code: summary.drift > 0 ? 2 : 0, summary, details };
}

async function runSync(root, effectiveMap, targets, { force, verbose, dryRun }) {
  const details = [];
  const summary = { synced: 0, kept: 0, skipped: 0 };
  for (const key of targets) {
    const { from, to, type } = effectiveMap[key];
    const dst = to(root);
    const srcOk = await exists(from);
    if (!srcOk) {
      summary.skipped++;
      details.push({ key, action: 'skip', reason: 'source-missing', from, dst });
      warn(`skip ${key} — source not found: ${from}`);
      continue;
    }
    if (!force && await exists(dst)) {
      summary.kept++;
      details.push({ key, action: 'keep', from, dst });
      if (verbose) log(`keep ${key} — exists: ${dst}`);
      continue;
    }
    if (dryRun) {
      summary.synced++;
      details.push({ key, action: 'plan-sync', from, dst, type });
      log(`[dry-run] ${key} -> ${dst}`);
      continue;
    }
    if (type === 'file') await ensureDirForFile(dst); else await mkdir(dst, { recursive: true });
    await cp(from, dst, { recursive: true, force: true });
    summary.synced++;
    details.push({ key, action: 'synced', from, dst, type });
    log(`synced ${key} -> ${dst}`);
  }
  log('sync done', summary, `(force=${force}, dry-run=${!!dryRun})`);
  return { code: 0, summary, details };
}

function printHelp(effectiveMap = BASE_MAP) {
  const keys = Object.keys(effectiveMap).join(', ');
  console.log(`kb-devkit-sync
Synchronize DevKit assets into a consumer repository.

Usage:
  kb-devkit-sync [--check] [--force] [--dry-run] [--verbose] [--json] [--timeout=ms] [--scope=managed-only|strict|all] [--only=a,b] [targets...]

Targets:
  ${keys}
  (Override/add via kb-labs.config.json → { "sync": { "overrides": {..}, "targets": {..}, "only": ["ci"], "disabled": ["sbom"], "scope": "managed-only" } })

Flags:
  --help, -h        Show this help and exit
  --version, -v     Print devkit version and exit
  --list            Print available target keys and exit
  --check           Compare and exit with 0 (no drift) or 2 (drift found)
  --force           Overwrite destination files/directories
  --dry-run         Do not write files; print planned actions
  --ci-only         Limit scope to CI templates (alias for --only=ci)
  --scope=...       Set drift scope: 'managed-only' (ignore foreign files, default), 'strict' (flag foreign files), 'all'
  --verbose         Print per-target details
  --json            Emit machine-readable JSON result to stdout
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
  const { help, version, check, force, verbose, json, dryRun, ciOnly, list, timeoutMs, onlyList, positional, scope: scopeFromCli } = parseArgs(args);
  const root = process.cwd();
  const cfg = await readProjectConfig(root);

  // Allow turning off sync entirely from config
  if (cfg?.sync?.enabled === false) {
    log('sync disabled by kb-labs.config.json');
    return 0;
  }

  const disabledSet = new Set(cfg?.sync?.disabled ?? []);
  const map = buildEffectiveMap(cfg);

  // If user asked to list available targets, do it early and exit
  if (list) {
    console.log('[devkit-sync] available targets:', Object.keys(map).join(', '));
    return 0;
  }

  const cfgOnly = Array.isArray(cfg?.sync?.only) ? cfg.sync.only.filter(s => typeof s === 'string' && s.length > 0) : [];
  // Priority: CLI --only > config `sync.only`; positional arguments are additive
  let select = onlyList.length ? onlyList.slice() : cfgOnly.slice();

  if (ciOnly) {
    const hasCi = select.includes('ci') || positional.includes('ci');
    if (!hasCi) {
      if (select.length === 0 && positional.length === 0) select = ['ci'];
      else select.push('ci');
    }
  }

  // Deduplicate while preserving order
  const seen = new Set();
  select = select.filter(k => (k && !seen.has(k) && seen.add(k)));

  const pos = positional.filter(Boolean);
  const targets = resolveTargets(map, { onlyList: select, positional: pos, disabledSet });

  // resolve scope precedence: CLI → config → default
  let scope = scopeFromCli || cfg?.sync?.scope || 'managed-only';
  if (!['managed-only', 'strict', 'all'].includes(scope)) scope = 'managed-only';

  if (help) { printHelp(map); return 0; }
  if (version) { await printVersion(); return 0; }

  const controller = new AbortController();
  const t = setTimeout(() => { controller.abort(); }, Math.max(0, timeoutMs));

  try {
    if (check) {
      const res = await runCheck(root, map, targets, { verbose, scope });
      if (json) console.log(JSON.stringify({ mode: 'check', ...res }, null, 2));
      return res.code;
    } else {
      const res = await runSync(root, map, targets, { force: force || !!cfg?.sync?.force, verbose, dryRun });
      // write provenance with items + scope
      await writeProvenance(root, { items: targets, scope });
      if (json) console.log(JSON.stringify({ mode: 'sync', ...res }, null, 2));
      return res.code;
    }
  } finally {
    clearTimeout(t);
  }
}
