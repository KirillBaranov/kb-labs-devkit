#!/usr/bin/env node

/**
 * @kb-labs/devkit - Naming Convention Validator
 *
 * Validates that all packages follow the Pyramid Rule:
 * @kb-labs/{repo}-{package}
 *
 * Folder name MUST match {repo}-{package}
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
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function extractRepoName(repoPath) {
  // kb-labs-core → core
  // kb-labs-cli → cli
  const match = repoPath.match(/kb-labs-([^/]+)/);
  return match ? match[1] : null;
}

function validatePackage(packageJsonPath, repoName) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;

  if (!packageName || !packageName.startsWith('@kb-labs/')) {
    return { valid: true, skip: true, reason: 'Not a @kb-labs package' };
  }

  const folderPath = path.dirname(packageJsonPath);
  const folderName = path.basename(folderPath);

  // Extract package name without @kb-labs/ prefix
  const shortName = packageName.replace('@kb-labs/', '');

  // Expected pattern: {repo}-{package}
  const expectedPrefix = `${repoName}-`;

  // Check 1: Package name should start with repo prefix
  if (!shortName.startsWith(expectedPrefix)) {
    return {
      valid: false,
      packageName,
      folderName,
      expectedPackageName: `@kb-labs/${expectedPrefix}${folderName.replace(new RegExp(`^${repoName}-`), '')}`,
      issue: `Package name missing repo prefix`,
      suggestion: `Rename to @kb-labs/${expectedPrefix}${folderName.replace(new RegExp(`^${repoName}-`), '')}`,
    };
  }

  // Check 2: Folder name should match package name
  if (folderName !== shortName) {
    return {
      valid: false,
      packageName,
      folderName,
      expectedFolderName: shortName,
      issue: 'Folder name does not match package name',
      suggestion: `Rename folder to ${shortName}`,
    };
  }

  // Check 3: Folder name should have repo prefix
  if (!folderName.startsWith(expectedPrefix)) {
    return {
      valid: false,
      packageName,
      folderName,
      expectedFolderName: `${expectedPrefix}${folderName}`,
      issue: 'Folder name missing repo prefix',
      suggestion: `Rename folder to ${expectedPrefix}${folderName}`,
    };
  }

  return { valid: true, packageName, folderName };
}

function findPackages(rootDir) {
  const packages = [];

  // Find all kb-labs-* directories
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('kb-labs-')) {continue;}

    const repoPath = path.join(rootDir, entry.name);
    const packagesDir = path.join(repoPath, 'packages');

    if (!fs.existsSync(packagesDir)) {continue;}

    const repoName = extractRepoName(entry.name);
    if (!repoName) {continue;}

    // Find all package.json files in packages/
    const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true });

    for (const pkgDir of packageDirs) {
      if (!pkgDir.isDirectory()) {continue;}

      const packageJsonPath = path.join(packagesDir, pkgDir.name, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        packages.push({
          path: packageJsonPath,
          repoName,
          repoPath: entry.name,
        });
      }
    }
  }

  return packages;
}

function main() {
  const rootDir = process.cwd();

  log('\n📦 KB Labs Naming Convention Validator\n', 'blue');
  log('Checking Pyramid Rule: @kb-labs/{repo}-{package}\n', 'gray');

  const packages = findPackages(rootDir);

  if (packages.length === 0) {
    log('⚠️  No KB Labs packages found in current directory', 'yellow');
    log('   Run this command from the monorepo root containing kb-labs-* folders\n', 'gray');
    process.exit(0);
  }

  log(`Found ${packages.length} packages to validate\n`, 'gray');

  const violations = [];
  const valid = [];

  for (const pkg of packages) {
    const result = validatePackage(pkg.path, pkg.repoName);

    if (result.skip) {continue;}

    if (result.valid) {
      valid.push({ ...result, repo: pkg.repoPath });
    } else {
      violations.push({ ...result, repo: pkg.repoPath, path: pkg.path });
    }
  }

  // Print valid packages
  if (valid.length > 0) {
    log('✅ Valid packages:', 'green');
    for (const v of valid) {
      log(`   ${v.folderName.padEnd(30)} → ${v.packageName}`, 'gray');
    }
    log('');
  }

  // Print violations
  if (violations.length > 0) {
    log(`❌ Found ${violations.length} naming convention violation(s):\n`, 'red');

    for (let i = 0; i < violations.length; i++) {
      const v = violations[i];
      log(`${i + 1}. ${v.repo}/packages/${v.folderName}/`, 'yellow');
      log(`   Issue: ${v.issue}`, 'red');
      log(`   Current package name: ${v.packageName}`, 'gray');
      log(`   Current folder name:  ${v.folderName}`, 'gray');

      if (v.expectedPackageName) {
        log(`   Expected package:     ${v.expectedPackageName}`, 'green');
      }
      if (v.expectedFolderName) {
        log(`   Expected folder:      ${v.expectedFolderName}`, 'green');
      }

      log(`   Suggestion: ${v.suggestion}`, 'blue');
      log('');
    }

    log('📖 See docs/naming-convention.md for the full guide\n', 'gray');
    process.exit(1);
  }

  log(`✅ All ${valid.length} packages follow the Pyramid Rule!\n`, 'green');
  process.exit(0);
}

main();
