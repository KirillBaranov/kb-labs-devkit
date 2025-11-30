#!/usr/bin/env node

/**
 * @kb-labs/devkit - TypeScript Types Checker
 *
 * Ensures all packages properly generate TypeScript declaration files (.d.ts).
 * Detects technical debt like `dts: false` in tsup configs.
 *
 * Usage:
 *   kb-devkit-check-types                 # Check all packages
 *   kb-devkit-check-types --package=cli   # Check specific package
 *   kb-devkit-check-types --fix           # Auto-fix dts: false
 *   kb-devkit-check-types --json          # JSON output
 *   kb-devkit-check-types --graph         # Show types dependency graph
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  if (!options.json) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  json: args.includes('--json'),
  graph: args.includes('--graph'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  package: args.find((arg) => arg.startsWith('--package='))?.split('=')[1],
};

/**
 * Find all packages
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
        packages.push({
          path: packageJsonPath,
          dir: path.join(packagesDir, pkgDir.name),
        });
      }
    }
  }

  return packages;
}

/**
 * Check if package has TypeScript source files
 */
function hasTypeScriptSources(packageDir) {
  const srcDir = path.join(packageDir, 'src');
  if (!fs.existsSync(srcDir)) return false;

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (walkDir(fullPath)) return true;
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        return true;
      }
    }

    return false;
  }

  return walkDir(srcDir);
}

/**
 * Check tsup.config for dts setting
 */
function checkTsupConfig(packageDir) {
  const tsupConfigPath = path.join(packageDir, 'tsup.config.ts');

  if (!fs.existsSync(tsupConfigPath)) {
    return { exists: false };
  }

  const content = fs.readFileSync(tsupConfigPath, 'utf-8');

  // Check for dts: false (bad!)
  const hasDtsFalse = /dts\s*:\s*false/.test(content);

  // Check for dts: true (good!)
  const hasDtsTrue = /dts\s*:\s*true/.test(content);

  // Check if dts is explicitly set
  const hasDtsConfig = /dts\s*:/.test(content);

  return {
    exists: true,
    path: tsupConfigPath,
    content,
    hasDtsFalse,
    hasDtsTrue,
    hasDtsConfig,
  };
}

/**
 * Check if package.json has types field
 */
function checkPackageJsonTypes(packagePath) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

  return {
    name: packageJson.name,
    hasTypes: !!packageJson.types || !!packageJson.typings,
    typesPath: packageJson.types || packageJson.typings,
    hasExports: !!packageJson.exports,
  };
}

/**
 * Check if dist folder has .d.ts files
 */
function checkDistFolder(packageDir) {
  const distDir = path.join(packageDir, 'dist');

  if (!fs.existsSync(distDir)) {
    return { exists: false, hasDts: false };
  }

  function hasDtsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (hasDtsFiles(fullPath)) return true;
      } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
        return true;
      }
    }

    return false;
  }

  return {
    exists: true,
    hasDts: hasDtsFiles(distDir),
  };
}

/**
 * Fix dts: false in tsup config
 */
function fixTsupConfig(tsupConfigPath, dryRun = false) {
  const content = fs.readFileSync(tsupConfigPath, 'utf-8');

  // Replace dts: false with dts: true
  const fixed = content.replace(/dts\s*:\s*false/g, 'dts: true');

  if (fixed !== content) {
    if (!dryRun) {
      fs.writeFileSync(tsupConfigPath, fixed);
    }
    return true;
  }

  return false;
}

/**
 * Check single package
 */
function checkPackage(packageInfo) {
  const { path: packagePath, dir: packageDir } = packageInfo;
  const packageJson = checkPackageJsonTypes(packagePath);
  const packageName = packageJson.name;

  if (!packageName || !packageName.startsWith('@kb-labs/')) {
    return null;
  }

  const hasTS = hasTypeScriptSources(packageDir);
  const tsupConfig = checkTsupConfig(packageDir);
  const dist = checkDistFolder(packageDir);

  const issues = [];

  // TypeScript sources but no tsup config
  if (hasTS && !tsupConfig.exists) {
    issues.push({
      type: 'no_tsup_config',
      severity: 'warning',
      message: 'Has TypeScript sources but no tsup.config.ts',
    });
  }

  // tsup config with dts: false (technical debt!)
  if (tsupConfig.hasDtsFalse) {
    issues.push({
      type: 'dts_false',
      severity: 'error',
      message: 'tsup.config.ts has dts: false (bad practice!)',
      fixable: true,
    });
  }

  // Has TypeScript but no dts config at all
  if (hasTS && tsupConfig.exists && !tsupConfig.hasDtsConfig) {
    issues.push({
      type: 'no_dts_config',
      severity: 'warning',
      message: 'tsup.config.ts missing dts configuration',
    });
  }

  // Has TypeScript but package.json has no types field
  if (hasTS && !packageJson.hasTypes) {
    issues.push({
      type: 'no_types_field',
      severity: 'error',
      message: 'package.json missing "types" field',
    });
  }

  // Has tsup with dts: true but no .d.ts files in dist
  if (tsupConfig.hasDtsTrue && dist.exists && !dist.hasDts) {
    issues.push({
      type: 'no_dist_types',
      severity: 'warning',
      message: 'No .d.ts files found in dist/ (need to build?)',
    });
  }

  return {
    name: packageName,
    dir: packageDir,
    hasTypeScript: hasTS,
    tsupConfig,
    dist,
    packageJson,
    issues,
    isClean: issues.length === 0,
  };
}

/**
 * Print results
 */
function printResults(results) {
  log('\n🔍 KB Labs TypeScript Types Checker\n', 'bold');

  const allPackages = results.filter(r => r !== null);
  const withIssues = allPackages.filter(r => !r.isClean);
  const dtsFalse = allPackages.filter(r => r.issues.some(i => i.type === 'dts_false'));
  const clean = allPackages.filter(r => r.isClean && r.hasTypeScript);

  log(`Found ${allPackages.length} package(s) to check\n`, 'gray');

  // Show packages with dts: false (technical debt!)
  if (dtsFalse.length > 0) {
    log(`🔴 Technical Debt: ${dtsFalse.length} package(s) with dts: false\n`, 'red');

    for (const result of dtsFalse) {
      log(`   ${result.name}`, 'yellow');
      log(`      ${result.tsupConfig.path}`, 'gray');
      log(`      └─ Has "dts: false" - types not being generated!`, 'red');

      if (options.fix) {
        const fixed = fixTsupConfig(result.tsupConfig.path, false);
        if (fixed) {
          log(`      ✅ Fixed: Changed to "dts: true"`, 'green');
        }
      }
    }
    log('', 'reset');

    if (!options.fix) {
      log('💡 Run with --fix to automatically change dts: false → dts: true\n', 'cyan');
    }
  }

  // Show other issues
  const otherIssues = withIssues.filter(r => !r.issues.some(i => i.type === 'dts_false'));

  if (otherIssues.length > 0) {
    log(`⚠️  Other Issues: ${otherIssues.length} package(s)\n`, 'yellow');

    for (const result of otherIssues) {
      log(`   ${result.name}`, 'yellow');

      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        log(`      ${icon} ${issue.message}`, 'gray');
      }
    }
    log('', 'reset');
  }

  // Show clean packages (only in verbose mode)
  if (options.verbose && clean.length > 0) {
    log(`✅ Clean packages with types: ${clean.length}\n`, 'green');

    for (const result of clean.slice(0, 10)) {
      log(`   ${result.name}`, 'gray');
    }

    if (clean.length > 10) {
      log(`   ... and ${clean.length - 10} more`, 'gray');
    }
    log('', 'reset');
  }

  // Summary
  log('─'.repeat(60) + '\n', 'gray');
  log('📊 Summary:\n', 'blue');

  log(`   Total packages:       ${allPackages.length}`, 'cyan');
  log(`   With TypeScript:      ${allPackages.filter(r => r.hasTypeScript).length}`, 'cyan');
  log(`   ✅ Clean:             ${clean.length}`, 'green');

  if (dtsFalse.length > 0) {
    log(`   🔴 dts: false:        ${dtsFalse.length} (technical debt!)`, 'red');
  }
  if (otherIssues.length > 0) {
    log(`   ⚠️  Other issues:      ${otherIssues.length}`, 'yellow');
  }

  log('', 'reset');

  // Tips
  log('💡 Tips:', 'blue');
  log('   • Use --fix to automatically fix dts: false', 'gray');
  log('   • Use --verbose to see all packages', 'gray');
  log('   • Run pnpm run build after fixing configs', 'gray');
  log('', 'reset');
}

/**
 * Build types dependency graph
 */
function buildTypesDependencyGraph(results) {
  const graph = new Map();

  // Build graph of packages that provide types
  for (const result of results) {
    if (!result || !result.hasTypeScript) continue;

    const hasTypes = result.tsupConfig.hasDtsTrue && !result.issues.some(i => i.type === 'dts_false');

    graph.set(result.name, {
      hasTypes,
      issues: result.issues.length,
    });
  }

  return graph;
}

/**
 * Main function
 */
function main() {
  const rootDir = process.cwd();

  if (!options.json) {
    log('\n🚀 KB Labs TypeScript Types Checker\n', 'bold');
  }

  const packages = findPackages(rootDir, options.package);

  if (packages.length === 0) {
    log('⚠️  No KB Labs packages found', 'yellow');
    process.exit(0);
  }

  // Check all packages
  const results = packages.map(checkPackage);

  if (options.json) {
    const output = {
      total: results.filter(r => r !== null).length,
      withTypeScript: results.filter(r => r && r.hasTypeScript).length,
      clean: results.filter(r => r && r.isClean && r.hasTypeScript).length,
      dtsFalse: results.filter(r => r && r.issues.some(i => i.type === 'dts_false')).length,
      issues: results.filter(r => r && !r.isClean).map(r => ({
        name: r.name,
        issues: r.issues,
      })),
    };

    console.log(JSON.stringify(output, null, 2));
  } else if (options.graph) {
    const graph = buildTypesDependencyGraph(results);
    log('\n📊 Types Dependency Graph\n', 'blue');

    for (const [pkg, info] of graph.entries()) {
      const status = info.hasTypes ? '✅' : '❌';
      log(`${status} ${pkg}${info.issues > 0 ? ` (${info.issues} issues)` : ''}`, info.hasTypes ? 'green' : 'red');
    }
    log('', 'reset');
  } else {
    printResults(results);
  }

  // Exit with error if issues found
  const hasIssues = results.some(r => r && !r.isClean);
  process.exit(hasIssues ? 1 : 0);
}

main();
