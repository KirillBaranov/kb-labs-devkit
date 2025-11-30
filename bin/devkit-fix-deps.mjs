#!/usr/bin/env node

/**
 * @kb-labs/devkit - Dependency Auto-Fixer
 *
 * Automatically fixes common dependency issues:
 * 1. Removes unused dependencies
 * 2. Adds missing workspace dependencies
 * 3. Aligns duplicate dependency versions
 *
 * Usage:
 *   kb-devkit-fix-deps --remove-unused     # Remove unused dependencies
 *   kb-devkit-fix-deps --add-missing       # Add missing workspace deps
 *   kb-devkit-fix-deps --align-versions    # Align duplicate versions
 *   kb-devkit-fix-deps --all               # Apply all fixes
 *   kb-devkit-fix-deps --dry-run           # Show what would be changed
 *   kb-devkit-fix-deps --orphans           # Find packages not used by anyone
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  removeUnused: args.includes('--remove-unused'),
  addMissing: args.includes('--add-missing'),
  alignVersions: args.includes('--align-versions'),
  all: args.includes('--all'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  showStats: args.includes('--stats'),
  showOrphans: args.includes('--orphans'),
  json: args.includes('--json'),
  package: args.find((arg) => arg.startsWith('--package='))?.split('=')[1],
};

// If --all, enable all fixes
if (options.all) {
  options.removeUnused = true;
  options.addMissing = true;
  options.alignVersions = true;
}

/**
 * Find all packages in monorepo
 */
function findPackages(rootDir, filterPackage) {
  const packages = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('kb-labs-')) continue;

    const repoPath = path.join(rootDir, entry.name);
    const packagesDir = path.join(repoPath, 'packages');

    if (!fs.existsSync(packagesDir)) continue;

    const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true });

    for (const pkgDir of packageDirs) {
      if (!pkgDir.isDirectory()) continue;

      if (filterPackage && pkgDir.name !== filterPackage) continue;

      const packageJsonPath = path.join(packagesDir, pkgDir.name, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        packages.push(packageJsonPath);
      }
    }
  }

  return packages;
}

/**
 * Extract imports from source files
 */
function extractImportsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = new Set();

  const patterns = [
    /import\s+(?:[\w*{}\n\r\t, ]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];

      // Extract package name (handle scoped packages)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        const pkgMatch = importPath.match(/^(@[^/]+\/[^/]+|[^/]+)/);
        if (pkgMatch) {
          imports.add(pkgMatch[1]);
        }
      }
    }
  }

  return imports;
}

/**
 * Find all imports in package
 */
function findUsedDependencies(packageDir) {
  const used = new Set();

  // Directories to scan
  const dirsToScan = ['src', 'test', 'tests', '__tests__', 'scripts'];

  for (const dir of dirsToScan) {
    const dirPath = path.join(packageDir, dir);
    if (fs.existsSync(dirPath)) {
      walkDir(dirPath, used);
    }
  }

  // Also scan config files in root
  const configPatterns = [
    'tsup.config.ts',
    'tsup.config.js',
    'vitest.config.ts',
    'vitest.config.js',
    'vite.config.ts',
    'vite.config.js',
    'eslint.config.js',
    'eslint.config.mjs',
    'jest.config.ts',
    'jest.config.js',
  ];

  for (const configFile of configPatterns) {
    const configPath = path.join(packageDir, configFile);
    if (fs.existsSync(configPath)) {
      const imports = extractImportsFromFile(configPath);
      imports.forEach((imp) => used.add(imp));
    }
  }

  return used;
}

/**
 * Walk directory and collect imports
 */
function walkDir(dir, used) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      walkDir(fullPath, used);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      const imports = extractImportsFromFile(fullPath);
      imports.forEach((imp) => used.add(imp));
    }
  }
}

/**
 * Remove unused dependencies
 */
function removeUnusedDependencies(packageJsonPath, dryRun, verbose = false) {
  const packageDir = path.dirname(packageJsonPath);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;

  if (!packageName || !packageName.startsWith('@kb-labs/')) {
    return { removed: 0, deps: [], kept: [] };
  }

  const used = findUsedDependencies(packageDir);
  const kept = []; // For verbose output
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const peerDeps = packageJson.peerDependencies || {};
  const toRemove = [];

  // Build tools that should not be removed (used via bin/cli, not imports)
  const keepDeps = new Set([
    // TypeScript & build
    'typescript',
    'tsup',
    'esbuild',
    'rollup',
    'vite',
    'rimraf',
    'concurrently',
    'cross-env',
    'tsx',
    'ts-node',

    // Linting & formatting
    'eslint',
    'prettier',
    'oxlint',

    // Testing
    'vitest',
    'jest',
    'mocha',
    'nyc',
    'c8',
    '@vitest/coverage-v8',
    '@vitest/ui',
    'playwright',
    '@playwright/test',

    // KB Labs devkit
    '@kb-labs/devkit',

    // Node types (used implicitly)
    '@types/node',
  ]);

  // Patterns for packages that shouldn't be removed
  const keepPatterns = [
    /^@types\//,           // Type definitions
    /^eslint-/,            // ESLint plugins/configs
    /^@eslint\//,          // ESLint scoped packages
    /^@vitest\//,          // Vitest plugins
    /^@testing-library\//, // Testing library
    /^@typescript-eslint/, // TS ESLint
    /^@vitejs\//,          // Vite plugins
    /^vite-plugin-/,       // Vite plugins
    /^rollup-plugin-/,     // Rollup plugins
    /^@rollup\//,          // Rollup scoped
    /^prettier-plugin-/,   // Prettier plugins
  ];

  for (const dep of Object.keys(allDeps)) {
    // Skip if it's used in code
    if (used.has(dep)) {
      if (verbose) kept.push({ dep, reason: 'used in code' });
      continue;
    }

    // Skip if it's a peer dependency (consumers might need it)
    if (peerDeps[dep]) {
      if (verbose) kept.push({ dep, reason: 'peer dependency' });
      continue;
    }

    // Skip if it's in keepDeps
    if (keepDeps.has(dep)) {
      if (verbose) kept.push({ dep, reason: 'build tool' });
      continue;
    }

    // Skip if matches any keep pattern
    const matchedPattern = keepPatterns.find((pattern) => pattern.test(dep));
    if (matchedPattern) {
      if (verbose) kept.push({ dep, reason: `pattern: ${matchedPattern.source}` });
      continue;
    }

    toRemove.push(dep);
  }

  if (toRemove.length > 0) {
    if (!dryRun) {
      // Remove from both dependencies and devDependencies
      for (const dep of toRemove) {
        delete packageJson.dependencies?.[dep];
        delete packageJson.devDependencies?.[dep];
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }

    return { removed: toRemove.length, deps: toRemove, packageName, kept, totalDeps: Object.keys(allDeps).length };
  }

  return { removed: 0, deps: [], packageName, kept, totalDeps: Object.keys(allDeps).length };
}

/**
 * Add missing workspace dependencies
 */
function addMissingDependencies(packageJsonPath, dryRun, allPackages) {
  const packageDir = path.dirname(packageJsonPath);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;

  if (!packageName || !packageName.startsWith('@kb-labs/')) {
    return { added: 0, deps: [] };
  }

  const used = findUsedDependencies(packageDir);
  const existing = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const toAdd = [];

  // Find missing workspace packages
  for (const dep of used) {
    if (dep.startsWith('@kb-labs/') && !existing[dep]) {
      // Check if this package exists in workspace
      const exists = allPackages.some((p) => {
        const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return json.name === dep;
      });

      if (exists) {
        toAdd.push(dep);
      }
    }
  }

  if (toAdd.length > 0) {
    if (!dryRun) {
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }

      for (const dep of toAdd) {
        packageJson.dependencies[dep] = 'workspace:*';
      }

      // Sort dependencies
      packageJson.dependencies = Object.fromEntries(
        Object.entries(packageJson.dependencies).sort()
      );

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }

    return { added: toAdd.length, deps: toAdd, packageName };
  }

  return { added: 0, deps: [], packageName };
}

/**
 * Collect version statistics
 */
function collectVersionStats(packages) {
  const versionMap = new Map();

  for (const packagePath of packages) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [dep, version] of Object.entries(allDeps)) {
      if (version.startsWith('workspace:') || version.startsWith('link:')) {
        continue;
      }

      if (!versionMap.has(dep)) {
        versionMap.set(dep, new Map());
      }

      const versions = versionMap.get(dep);
      if (!versions.has(version)) {
        versions.set(version, []);
      }
      versions.get(version).push(packagePath);
    }
  }

  return versionMap;
}

/**
 * Align dependency versions
 */
function alignDependencyVersions(packages, dryRun) {
  const versionMap = collectVersionStats(packages);
  let totalAligned = 0;
  const changes = [];

  for (const [dep, versions] of versionMap.entries()) {
    if (versions.size <= 1) continue;

    // Pick the most common version (or newest if tie)
    const versionArray = Array.from(versions.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    const targetVersion = versionArray[0][0];
    const targetCount = versionArray[0][1].length;

    // Align all packages to target version
    for (const [version, packagePaths] of versions.entries()) {
      if (version === targetVersion) continue;

      for (const packagePath of packagePaths) {
        if (!dryRun) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

          if (packageJson.dependencies?.[dep]) {
            packageJson.dependencies[dep] = targetVersion;
          }
          if (packageJson.devDependencies?.[dep]) {
            packageJson.devDependencies[dep] = targetVersion;
          }

          fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
        }

        totalAligned++;
        changes.push({
          package: JSON.parse(fs.readFileSync(packagePath, 'utf-8')).name,
          dep,
          from: version,
          to: targetVersion,
        });
      }
    }
  }

  return { totalAligned, changes };
}

/**
 * Show dependency statistics
 */
function showDependencyStats(packages) {
  log('\n📊 Dependency Statistics\n', 'cyan');

  let totalDeps = 0;
  let totalDevDeps = 0;
  let totalPeerDeps = 0;
  let unusedCount = 0;
  const depUsage = new Map(); // dep -> count of packages using it

  for (const packagePath of packages) {
    const packageDir = path.dirname(packagePath);
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    const peerDeps = Object.keys(packageJson.peerDependencies || {});

    totalDeps += deps.length;
    totalDevDeps += devDeps.length;
    totalPeerDeps += peerDeps.length;

    // Track dep usage across packages
    for (const dep of [...deps, ...devDeps]) {
      depUsage.set(dep, (depUsage.get(dep) || 0) + 1);
    }

    // Check for unused
    const used = findUsedDependencies(packageDir);
    for (const dep of deps) {
      if (!used.has(dep) && !dep.startsWith('@types/')) {
        unusedCount++;
      }
    }
  }

  log(`📦 Total packages:        ${packages.length}`, 'cyan');
  log(`📚 Total dependencies:    ${totalDeps}`, 'cyan');
  log(`🔧 Total devDependencies: ${totalDevDeps}`, 'cyan');
  log(`🔗 Total peerDependencies: ${totalPeerDeps}`, 'cyan');
  log('', 'reset');

  // Top used dependencies
  const sortedDeps = Array.from(depUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  log('🔝 Top 10 Most Used Dependencies:\n', 'blue');
  for (let i = 0; i < sortedDeps.length; i++) {
    const [dep, count] = sortedDeps[i];
    log(`   ${(i + 1).toString().padStart(2)}. ${dep} (${count} packages)`, 'gray');
  }
  log('', 'reset');

  // Potentially unused (very rough estimate)
  if (unusedCount > 0) {
    log(`⚠️  Potentially unused deps: ${unusedCount}`, 'yellow');
    log('   Run --remove-unused --dry-run to see details\n', 'gray');
  } else {
    log('✅ No obviously unused dependencies detected\n', 'green');
  }
}

/**
 * Find orphan packages - packages that no other package depends on
 */
function findOrphanPackages(packages) {
  // Build map of package names to their paths
  const packageMap = new Map();
  for (const packagePath of packages) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    if (packageJson.name?.startsWith('@kb-labs/')) {
      packageMap.set(packageJson.name, {
        path: packagePath,
        dir: path.dirname(packagePath),
        repo: path.basename(path.dirname(path.dirname(path.dirname(packagePath)))),
      });
    }
  }

  // Collect all dependencies across all packages
  const dependedOn = new Set();
  for (const packagePath of packages) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    // Combine all dependency types
    const allDeps = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {}),
    ];

    for (const dep of allDeps) {
      if (dep.startsWith('@kb-labs/')) {
        dependedOn.add(dep);
      }
    }
  }

  // Find packages that are NOT depended on by anyone
  const orphans = [];
  for (const [name, info] of packageMap.entries()) {
    if (!dependedOn.has(name)) {
      orphans.push({ name, ...info });
    }
  }

  return { orphans, totalPackages: packageMap.size, dependedOn: dependedOn.size };
}

/**
 * Categorize orphan packages
 */
function categorizeOrphans(orphans) {
  const categories = {
    cliEntryPoints: [],    // CLI tools (expected to be orphans)
    apps: [],              // Application entry points
    plugins: [],           // Plugin packages
    templates: [],         // Template packages
    external: [],          // Packages meant for external consumption
    internal: [],          // Internal packages (potential issues)
  };

  for (const pkg of orphans) {
    const name = pkg.name.replace('@kb-labs/', '');

    // CLI entry points (expected orphans)
    if (name.endsWith('-cli') || name === 'cli-core' || name === 'cli-bin') {
      categories.cliEntryPoints.push(pkg);
    }
    // Plugin packages (often standalone) - check both name pattern and repo
    else if (name.endsWith('-plugin') || name.includes('plugin-') || pkg.repo === 'kb-labs-plugin') {
      categories.plugins.push(pkg);
    }
    // App entry points
    else if (name.endsWith('-app') || name.endsWith('-api') || name.endsWith('-server')) {
      categories.apps.push(pkg);
    }
    // Template packages
    else if (name.includes('template-') || name.includes('-template')) {
      categories.templates.push(pkg);
    }
    // External-facing packages (libs meant for consumers)
    else if (
      name.endsWith('-core') ||          // Core packages often consumed externally
      name === 'ui-core' ||              // UI library
      name === 'ui-react' ||             // React components
      name === 'data-client' ||          // Client library
      pkg.repo === 'kb-labs-studio' ||   // Studio packages are user-facing
      // Core infrastructure packages (meant for external consumption)
      name === 'core-framework' ||
      name === 'core-state-daemon' ||
      name === 'core-tenant' ||
      name === 'core-profile-toolkit'
    ) {
      categories.external.push(pkg);
    }
    // Internal packages (potential dead code)
    else {
      categories.internal.push(pkg);
    }
  }

  return categories;
}

/**
 * Show orphan packages analysis
 */
function showOrphanPackages(packages) {
  log('\n👻 Orphan Packages Analysis\n', 'cyan');
  log('Finding packages that no other package depends on...\n', 'gray');

  const { orphans, totalPackages, dependedOn } = findOrphanPackages(packages);
  const categories = categorizeOrphans(orphans);

  log(`📦 Total @kb-labs/* packages:    ${totalPackages}`, 'cyan');
  log(`🔗 Packages with dependents:     ${dependedOn}`, 'cyan');
  log(`👻 Orphan packages:              ${orphans.length}`, orphans.length > 0 ? 'yellow' : 'green');
  log('', 'reset');

  // Show by category
  if (categories.cliEntryPoints.length > 0) {
    log(`✅ CLI Entry Points (${categories.cliEntryPoints.length}) - Expected orphans:`, 'green');
    for (const pkg of categories.cliEntryPoints) {
      log(`   ${pkg.name}`, 'gray');
    }
    log('', 'reset');
  }

  if (categories.apps.length > 0) {
    log(`✅ Application Entry Points (${categories.apps.length}) - Expected orphans:`, 'green');
    for (const pkg of categories.apps) {
      log(`   ${pkg.name}`, 'gray');
    }
    log('', 'reset');
  }

  if (categories.plugins.length > 0) {
    log(`📦 Plugin Packages (${categories.plugins.length}) - Usually standalone:`, 'blue');
    for (const pkg of categories.plugins) {
      log(`   ${pkg.name}`, 'gray');
    }
    log('', 'reset');
  }

  if (categories.templates.length > 0) {
    log(`📄 Template Packages (${categories.templates.length}) - Expected orphans:`, 'blue');
    for (const pkg of categories.templates) {
      log(`   ${pkg.name}`, 'gray');
    }
    log('', 'reset');
  }

  if (categories.external.length > 0) {
    log(`📤 External/Library Packages (${categories.external.length}) - Consumed externally:`, 'blue');
    for (const pkg of categories.external) {
      log(`   ${pkg.name}`, 'gray');
    }
    log('', 'reset');
  }

  // Internal packages - these might be dead code
  if (categories.internal.length > 0) {
    log(`⚠️  Internal Packages Without Dependents (${categories.internal.length}) - Review needed:`, 'yellow');
    log('   These might be dead code or missing from dependency lists:\n', 'gray');

    // Group by repo
    const byRepo = new Map();
    for (const pkg of categories.internal) {
      if (!byRepo.has(pkg.repo)) {
        byRepo.set(pkg.repo, []);
      }
      byRepo.get(pkg.repo).push(pkg);
    }

    for (const [repo, pkgs] of byRepo.entries()) {
      log(`   ${repo}/`, 'yellow');
      for (const pkg of pkgs) {
        log(`      ${pkg.name}`, 'red');
      }
    }
    log('', 'reset');

    log('💡 Actions:', 'blue');
    log('   1. If these packages are used externally, they\'re fine as orphans', 'gray');
    log('   2. If they should be used internally, add them as dependencies', 'gray');
    log('   3. If they\'re truly unused, consider removing them', 'gray');
    log('', 'reset');
  } else {
    log('✅ No suspicious internal orphan packages found\n', 'green');
  }

  // Summary
  const expectedOrphans =
    categories.cliEntryPoints.length +
    categories.apps.length +
    categories.plugins.length +
    categories.templates.length +
    categories.external.length;

  log('─'.repeat(60), 'gray');
  log('📊 Summary:', 'blue');
  log(`   Expected orphans (CLI/Apps/Plugins/Templates/External): ${expectedOrphans}`, 'green');
  log(`   Review needed (internal packages):                      ${categories.internal.length}`, categories.internal.length > 0 ? 'yellow' : 'green');
  log('', 'reset');

  return { orphans, categories };
}

/**
 * Main function
 */
function main() {
  const rootDir = process.cwd();

  if (!options.json) {
    log('\n🔧 KB Labs Dependency Fixer\n', 'blue');

    if (options.dryRun) {
      log('🔍 DRY RUN MODE - No changes will be made\n', 'yellow');
    }
  }

  const packages = findPackages(rootDir, options.package);

  if (packages.length === 0) {
    if (!options.json) {
      log('⚠️  No KB Labs packages found', 'yellow');
    }
    process.exit(0);
  }

  if (!options.json) {
    log(`Found ${packages.length} package(s)\n`, 'gray');
  }

  // Stats mode - just show dependency statistics
  if (options.showStats) {
    showDependencyStats(packages);
    process.exit(0);
  }

  // Orphan packages mode - find packages not used by anyone
  if (options.showOrphans) {
    if (options.json) {
      const { orphans, totalPackages, dependedOn } = findOrphanPackages(packages);
      const categories = categorizeOrphans(orphans);
      console.log(JSON.stringify({
        totalPackages,
        dependedOn,
        orphanCount: orphans.length,
        categories: {
          cliEntryPoints: categories.cliEntryPoints.map(p => p.name),
          apps: categories.apps.map(p => p.name),
          plugins: categories.plugins.map(p => p.name),
          templates: categories.templates.map(p => p.name),
          external: categories.external.map(p => p.name),
          internal: categories.internal.map(p => p.name),
        },
        reviewNeeded: categories.internal.map(p => ({ name: p.name, repo: p.repo })),
      }, null, 2));
      process.exit(categories.internal.length > 0 ? 1 : 0);
    }
    const { categories } = showOrphanPackages(packages);
    // Exit with error if there are suspicious internal orphans
    process.exit(categories.internal.length > 0 ? 1 : 0);
  }

  let hasChanges = false;

  // Remove unused dependencies
  if (options.removeUnused) {
    log('🗑️  Removing unused dependencies...\n', 'cyan');

    let totalRemoved = 0;
    let totalScanned = 0;
    const removals = [];

    for (const packagePath of packages) {
      const result = removeUnusedDependencies(packagePath, options.dryRun, options.verbose);
      totalScanned += result.totalDeps || 0;

      if (result.removed > 0) {
        totalRemoved += result.removed;
        removals.push(result);

        log(`   ${result.packageName}`, 'yellow');
        for (const dep of result.deps) {
          log(`      - ${dep}`, 'red');
        }

        // Show kept deps in verbose mode
        if (options.verbose && result.kept.length > 0) {
          log(`      kept:`, 'gray');
          for (const { dep, reason } of result.kept.slice(0, 5)) {
            log(`        ✓ ${dep} (${reason})`, 'gray');
          }
          if (result.kept.length > 5) {
            log(`        ... and ${result.kept.length - 5} more`, 'gray');
          }
        }
      }
    }

    if (totalRemoved > 0) {
      hasChanges = true;
      log(`\n   ✅ Removed ${totalRemoved} unused dependency(ies)`, 'green');
      log(`   📊 Scanned ${totalScanned} total dependencies across ${packages.length} packages\n`, 'gray');
    } else {
      log('   ✅ No unused dependencies found\n', 'green');
    }
  }

  // Add missing dependencies
  if (options.addMissing) {
    log('➕ Adding missing workspace dependencies...\n', 'cyan');

    let totalAdded = 0;
    const additions = [];

    for (const packagePath of packages) {
      const result = addMissingDependencies(packagePath, options.dryRun, packages);
      if (result.added > 0) {
        totalAdded += result.added;
        additions.push(result);

        log(`   ${result.packageName}`, 'yellow');
        for (const dep of result.deps) {
          log(`      + ${dep}`, 'gray');
        }
      }
    }

    if (totalAdded > 0) {
      hasChanges = true;
      log(`\n   ✅ Added ${totalAdded} missing dependency(ies)\n`, 'green');
    } else {
      log('   ✅ No missing dependencies found\n', 'green');
    }
  }

  // Align versions
  if (options.alignVersions) {
    log('🔄 Aligning dependency versions...\n', 'cyan');

    const { totalAligned, changes } = alignDependencyVersions(packages, options.dryRun);

    if (totalAligned > 0) {
      hasChanges = true;

      // Group by dependency
      const byDep = new Map();
      for (const change of changes) {
        if (!byDep.has(change.dep)) {
          byDep.set(change.dep, []);
        }
        byDep.get(change.dep).push(change);
      }

      for (const [dep, depChanges] of byDep.entries()) {
        const targetVersion = depChanges[0].to;
        log(`   ${dep} → ${targetVersion}`, 'yellow');
        log(`      ${depChanges.length} package(s) updated`, 'gray');
      }

      log(`\n   ✅ Aligned ${totalAligned} dependency version(s)\n`, 'green');
    } else {
      log('   ✅ No version conflicts found\n', 'green');
    }
  }

  // Summary
  if (!options.removeUnused && !options.addMissing && !options.alignVersions) {
    log('⚠️  No fix mode specified\n', 'yellow');
    log('Fix modes:', 'blue');
    log('   --remove-unused     Remove unused dependencies', 'gray');
    log('   --add-missing       Add missing workspace dependencies', 'gray');
    log('   --align-versions    Align duplicate dependency versions', 'gray');
    log('   --all               Apply all fixes', 'gray');
    log('', 'reset');
    log('Analysis modes:', 'blue');
    log('   --stats             Show dependency statistics', 'gray');
    log('   --orphans           Find packages not used by anyone', 'gray');
    log('', 'reset');
    log('Options:', 'blue');
    log('   --dry-run           Preview changes without applying', 'gray');
    log('   --verbose, -v       Show why dependencies were kept', 'gray');
    log('   --json              Output results in JSON format', 'gray');
    log('   --package=<name>    Process only specific package', 'gray');
    log('');
    log('Examples:', 'blue');
    log('   npx kb-devkit-fix-deps --stats', 'gray');
    log('   npx kb-devkit-fix-deps --orphans', 'gray');
    log('   npx kb-devkit-fix-deps --orphans --json', 'gray');
    log('   npx kb-devkit-fix-deps --remove-unused --dry-run', 'gray');
    log('   npx kb-devkit-fix-deps --all --package=cli-core', 'gray');
    log('');
    process.exit(0);
  }

  if (options.dryRun && hasChanges) {
    log('💡 Run without --dry-run to apply changes\n', 'blue');
  } else if (!options.dryRun && hasChanges) {
    log('💡 Don\'t forget to run: pnpm install\n', 'blue');
  }

  process.exit(0);
}

main();
