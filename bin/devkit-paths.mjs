#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, join } from 'node:path';
import { promises as fs } from 'node:fs';
import process from 'node:process';
import { glob } from 'glob';
import { parse as parseYaml } from 'yaml';

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

async function findWorkspaceConfigs(startDir) {
  const roots = [];
  let current = resolve(startDir);
  let prev = null;
  while (current !== prev) {
    const wsFile = join(current, 'pnpm-workspace.yaml');
    if (await exists(wsFile)) {
      try {
        const yaml = await fs.readFile(wsFile, 'utf8');
        const data = parseYaml(yaml);
        const patterns = Array.isArray(data?.packages) ? data.packages.filter(Boolean) : [];
        roots.push({ dir: current, patterns });
      } catch (error) {
        console.warn('[devkit-paths] failed to read workspace config', wsFile, error);
      }
    }
    prev = current;
    current = dirname(current);
  }
  return roots;
}

async function collectWorkspacePackages(workspaceRoots, cwd) {
  const packages = new Map();

  for (const { dir, patterns } of workspaceRoots) {
    for (const pattern of patterns) {
      if (!pattern || typeof pattern !== 'string') continue;
      const searchPattern = pattern.endsWith('/') ? `${pattern}package.json` : join(pattern, 'package.json');
      const matches = await glob(searchPattern, {
        cwd: dir,
        dot: false,
        nodir: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
      for (const match of matches) {
        try {
          const pkgPath = resolve(dir, match);
          const pkgDir = dirname(pkgPath);
          const pkg = await readJson(pkgPath);
          if (!pkg?.name || typeof pkg.name !== 'string') continue;
          if (!pkg.name.startsWith('@kb-labs/')) continue;
          if (!packages.has(pkg.name)) {
            packages.set(pkg.name, pkgDir);
          }
        } catch (error) {
          console.warn('[devkit-paths] failed to read package', match, error);
        }
      }
    }
  }

  return packages;
}

async function resolveSourceEntries(pkgDir) {
  const entries = [];
  const candidates = [
    'src/index.ts',
    'src/index.tsx',
    'src/index.js',
    'dist/index.d.ts',
    'dist/index.js',
  ];
  for (const candidate of candidates) {
    const abs = join(pkgDir, candidate);
    if (await exists(abs)) {
      entries.push(abs);
      break;
    }
  }
  const wildcardBase = await exists(join(pkgDir, 'src')) ? join(pkgDir, 'src') : null;
  return { entries, wildcardBase };
}

async function generatePathsFile(rootDir) {
  const workspaceRoots = await findWorkspaceConfigs(rootDir);
  if (!workspaceRoots.length) {
    console.error('[devkit-paths] no pnpm-workspace.yaml found up the tree');
    process.exit(1);
  }

  const packages = await collectWorkspacePackages(workspaceRoots, rootDir);
  if (!packages.size) {
    console.warn('[devkit-paths] no packages discovered');
  }

  const paths = {};
  for (const [name, pkgDir] of packages) {
    const relDir = relative(rootDir, pkgDir).replace(/\\/g, '/');
    const { entries, wildcardBase } = await resolveSourceEntries(pkgDir);
    const resolvedEntries = entries.map((abs) => relative(rootDir, abs).replace(/\\/g, '/'));
    if (!resolvedEntries.length) continue;
    paths[name] = resolvedEntries;
    if (wildcardBase) {
      const relBase = relative(rootDir, wildcardBase).replace(/\\/g, '/');
      paths[`${name}/*`] = [`${relBase}/*`];
    }
  }

  const output = {
    $schema: 'https://json.schemastore.org/tsconfig',
    compilerOptions: {
      baseUrl: '.',
      paths: Object.keys(paths)
        .sort()
        .reduce((acc, key) => {
          acc[key] = paths[key];
          return acc;
        }, {}),
    },
  };

  const outPath = join(rootDir, 'tsconfig.paths.json');
  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`[devkit-paths] wrote ${Object.keys(paths).length} mappings to ${relative(rootDir, outPath) || 'tsconfig.paths.json'}`);
}

async function main() {
  const rootDir = process.cwd();
  await generatePathsFile(rootDir);
}

main().catch((error) => {
  console.error('[devkit-paths] failed', error);
  process.exit(1);
});
