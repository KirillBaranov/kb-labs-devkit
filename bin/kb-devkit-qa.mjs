#!/usr/bin/env node

/**
 * KB Labs Quality Assurance Runner
 * 
 * Runs comprehensive checks across entire monorepo:
 * 1. Build all packages in correct layer order
 * 2. Run linter on all packages
 * 3. Run type-check on all packages  
 * 4. Run tests on all packages
 * 
 * Continues on errors and shows comprehensive report at the end.
 * 
 * Usage:
 *   npx kb-devkit-qa                    # Human-readable output
 *   npx kb-devkit-qa --json             # JSON output for agents
 *   npx kb-devkit-qa --skip-build       # Skip build phase
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join } from 'path'

// Parse args
const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const skipBuild = args.includes('--skip-build')
const skipLint = args.includes('--skip-lint')
const skipTypes = args.includes('--skip-types')
const skipTests = args.includes('--skip-tests')

// ANSI colors (disabled in JSON mode)
const colors = jsonMode ? {
  reset: '', bright: '', red: '', green: '', yellow: '', blue: '', cyan: '', gray: '',
} : {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function log(msg, color = 'reset') {
  if (!jsonMode) {
    console.log(`${colors[color]}${msg}${colors.reset}`)
  }
}

function header(msg) {
  if (!jsonMode) {
    log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
  }
}

const results = {
  build: { passed: [], failed: [], skipped: [], errors: {} },
  lint: { passed: [], failed: [], skipped: [], errors: {} },
  typeCheck: { passed: [], failed: [], skipped: [], errors: {} },
  test: { passed: [], failed: [], skipped: [], errors: {} },
}

// Get all workspace packages
function getWorkspacePackages() {
  try {
    const output = execSync('pnpm list -r --depth -1 --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    return JSON.parse(output)
      .filter(pkg => pkg.name?.startsWith('@kb-labs/'))
      .map(pkg => ({ name: pkg.name, path: pkg.path }))
  } catch (err) {
    log('Failed to get workspace packages', 'red')
    process.exit(1)
  }
}

// Get latest modification time in directory recursively
function getLatestMtime(dir) {
  if (!existsSync(dir)) return 0

  let latest = 0
  try {
    const files = readdirSync(dir, { withFileTypes: true })
    for (const file of files) {
      const fullPath = join(dir, file.name)
      if (file.isDirectory()) {
        const dirMtime = getLatestMtime(fullPath)
        if (dirMtime > latest) latest = dirMtime
      } else {
        const stat = statSync(fullPath)
        if (stat.mtimeMs > latest) latest = stat.mtimeMs
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
  return latest
}

// Check if package needs rebuild
function needsRebuild(pkgPath) {
  const srcDir = join(pkgPath, 'src')
  const distDir = join(pkgPath, 'dist')

  // If dist doesn't exist, needs build
  if (!existsSync(distDir)) return true

  // If src doesn't exist, skip (might be types-only package)
  if (!existsSync(srcDir)) return false

  // Compare modification times
  const srcMtime = getLatestMtime(srcDir)
  const distMtime = getLatestMtime(distDir)

  // If src is newer than dist, needs rebuild
  return srcMtime > distMtime
}

// Build all packages in layer order
async function buildAllLayers() {
  header('🔨 Building all packages in correct dependency order...')
  
  try {
    // Generate build order
    log('📊 Calculating build order...', 'gray')
    let buildOrder = execSync('npx kb-devkit-build-order --layers', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    // Strip ANSI codes
    buildOrder = buildOrder.replace(/\x1b\[[0-9;]*m/g, '')

    // Parse layers
    const layerMatches = buildOrder.matchAll(/Layer (\d+).*?:\s+((?:@kb-labs\/[\w-]+\s*)+)/gs)
    const layers = []
    
    for (const match of layerMatches) {
      const layerNum = parseInt(match[1])
      const packages = match[2]
        .trim()
        .split(/\s+/)
        .filter(pkg => pkg.startsWith('@kb-labs/'))
      layers.push({ num: layerNum, packages })
    }
    
    log(`Found ${layers.length} layers to build\n`, 'gray')
    
    // Get package paths for timestamp checking
    const allPackages = getWorkspacePackages()
    const pkgPathMap = new Map(allPackages.map(p => [p.name, p.path]))

    // Build each layer
    for (const layer of layers) {
      log(`🔨 Building Layer ${layer.num}/${layers.length} (${layer.packages.length} packages)...`, 'cyan')

      for (const pkg of layer.packages) {
        const pkgPath = pkgPathMap.get(pkg)

        // Check if rebuild is needed
        if (pkgPath && !needsRebuild(pkgPath)) {
          results.build.skipped.push(pkg)
          if (!jsonMode) process.stdout.write(`${colors.gray}-${colors.reset}`)
          continue
        }

        try {
          execSync(`pnpm --filter ${pkg} run build`, {
            encoding: 'utf-8',
            stdio: 'pipe',
          })
          results.build.passed.push(pkg)
          if (!jsonMode) process.stdout.write(`${colors.green}.${colors.reset}`)
        } catch (err) {
          results.build.failed.push(pkg)
          results.build.errors[pkg] = err.stderr || err.stdout || err.message
          if (!jsonMode) process.stdout.write(`${colors.red}F${colors.reset}`)
        }
      }
      if (!jsonMode) console.log('')
    }
    
    log(`\n✅ Build complete: ${results.build.passed.length} passed, ${results.build.failed.length} failed, ${results.build.skipped.length} skipped (up-to-date)\n`, 'green')
    
  } catch (err) {
    log('❌ Build order calculation failed', 'red')
    throw err
  }
}

// Run command on all packages
async function runOnAllPackages(command, label, resultKey) {
  header(`${label}...`)
  
  const packages = getWorkspacePackages()
  log(`Running on ${packages.length} packages\n`, 'gray')
  
  for (const pkg of packages) {
    try {
      execSync(`pnpm --filter ${pkg.name} ${command}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      })
      results[resultKey].passed.push(pkg.name)
      if (!jsonMode) process.stdout.write(`${colors.green}.${colors.reset}`)
    } catch (err) {
      // Check if script doesn't exist
      if (err.message.includes('missing script')) {
        results[resultKey].skipped.push(pkg.name)
        if (!jsonMode) process.stdout.write(`${colors.gray}-${colors.reset}`)
      } else {
        results[resultKey].failed.push(pkg.name)
        results[resultKey].errors[pkg.name] = err.stderr || err.stdout || err.message
        if (!jsonMode) process.stdout.write(`${colors.red}F${colors.reset}`)
      }
    }
  }
  
  if (!jsonMode) console.log('')
  log(`\n✅ ${label} complete: ${results[resultKey].passed.length} passed, ${results[resultKey].failed.length} failed, ${results[resultKey].skipped.length} skipped\n`, 'green')
}

// Load baseline if exists
function loadBaseline() {
  const baselinePath = '.baseline/types-results.json'
  if (existsSync(baselinePath)) {
    try {
      return JSON.parse(readFileSync(baselinePath, 'utf-8'))
    } catch (err) {
      return null
    }
  }
  return null
}

// Calculate diff with baseline
function calculateDiff(baseline) {
  if (!baseline || !baseline.packages) return null
  
  const currentFailed = new Set(results.typeCheck.failed)
  const baselineFailed = new Set(
    Object.entries(baseline.packages)
      .filter(([_, data]) => data.errors > 0)
      .map(([pkg, _]) => pkg)
  )
  
  const newFailures = [...currentFailed].filter(pkg => !baselineFailed.has(pkg))
  const fixed = [...baselineFailed].filter(pkg => !currentFailed.has(pkg))
  const stillFailing = [...currentFailed].filter(pkg => baselineFailed.has(pkg))
  
  return {
    newFailures,
    fixed,
    stillFailing,
    summary: {
      baseline: baselineFailed.size,
      current: currentFailed.size,
      delta: currentFailed.size - baselineFailed.size,
    }
  }
}

// Print JSON report for agents
function printJsonReport(baseline, diff) {
  const report = {
    status: (results.build.failed.length + results.lint.failed.length + 
             results.typeCheck.failed.length + results.test.failed.length) === 0 ? 'passed' : 'failed',
    timestamp: new Date().toISOString(),
    summary: {
      build: {
        passed: results.build.passed.length,
        failed: results.build.failed.length,
        skipped: results.build.skipped.length,
      },
      lint: {
        passed: results.lint.passed.length,
        failed: results.lint.failed.length,
        skipped: results.lint.skipped.length,
      },
      typeCheck: {
        passed: results.typeCheck.passed.length,
        failed: results.typeCheck.failed.length,
        skipped: results.typeCheck.skipped.length,
      },
      test: {
        passed: results.test.passed.length,
        failed: results.test.failed.length,
        skipped: results.test.skipped.length,
      },
    },
    failures: {
      build: results.build.failed,
      lint: results.lint.failed,
      typeCheck: results.typeCheck.failed,
      test: results.test.failed,
    },
    errors: {
      build: results.build.errors,
      lint: results.lint.errors,
      typeCheck: results.typeCheck.errors,
      test: results.test.errors,
    },
    baseline: diff ? {
      newFailures: diff.newFailures,
      fixed: diff.fixed,
      stillFailing: diff.stillFailing,
      summary: diff.summary,
    } : null,
  }
  
  console.log(JSON.stringify(report, null, 2))
}

// Print human-readable report
function printHumanReport(baseline, diff) {
  header('📊 QA Summary Report')
  
  const checks = [
    { name: 'Build', key: 'build', icon: '🔨' },
    { name: 'Lint', key: 'lint', icon: '🔍' },
    { name: 'Type Check', key: 'typeCheck', icon: '📘' },
    { name: 'Tests', key: 'test', icon: '🧪' },
  ]
  
  let totalPassed = 0
  let totalFailed = 0
  let totalSkipped = 0
  let hasFailures = false
  
  for (const check of checks) {
    const result = results[check.key]
    const passed = result.passed.length
    const failed = result.failed.length
    const skipped = result.skipped.length
    const total = passed + failed + skipped
    
    totalPassed += passed
    totalFailed += failed
    totalSkipped += skipped
    
    if (failed > 0) hasFailures = true
    
    const status = failed > 0 ? `${colors.red}❌` : `${colors.green}✅`
    const percentage = total > 0 ? Math.round((passed / (total - skipped)) * 100) : 100
    
    log(`${status} ${check.icon}  ${check.name.padEnd(12)} ${passed}/${total - skipped} passed (${percentage}%)${colors.reset}`)
    
    // Show failed packages
    if (failed > 0) {
      log(`   ${colors.red}Failed packages:${colors.reset}`, 'red')
      for (const pkg of result.failed.slice(0, 10)) {
        log(`     - ${pkg}`, 'red')
      }
      if (failed > 10) {
        log(`     ... and ${failed - 10} more`, 'gray')
      }
    }
  }
  
  // Show baseline diff if available
  if (diff) {
    log('')
    log('📈 Baseline Comparison (Type Check):', 'cyan')
    log(`   Baseline errors: ${diff.summary.baseline}`, 'gray')
    log(`   Current errors:  ${diff.summary.current}`, 'gray')
    
    if (diff.summary.delta > 0) {
      log(`   ❌ +${diff.summary.delta} NEW failures (regression!)`, 'red')
    } else if (diff.summary.delta < 0) {
      log(`   ✅ ${Math.abs(diff.summary.delta)} failures FIXED (improvement!)`, 'green')
    } else {
      log(`   ➡️  No change`, 'yellow')
    }
    
    if (diff.newFailures.length > 0) {
      log(`\n   🆕 New failures (${diff.newFailures.length}):`, 'red')
      for (const pkg of diff.newFailures.slice(0, 5)) {
        log(`     - ${pkg}`, 'red')
      }
      if (diff.newFailures.length > 5) {
        log(`     ... and ${diff.newFailures.length - 5} more`, 'gray')
      }
    }
    
    if (diff.fixed.length > 0) {
      log(`\n   ✅ Fixed (${diff.fixed.length}):`, 'green')
      for (const pkg of diff.fixed.slice(0, 5)) {
        log(`     - ${pkg}`, 'green')
      }
      if (diff.fixed.length > 5) {
        log(`     ... and ${diff.fixed.length - 5} more`, 'gray')
      }
    }
  }
  
  log('')
  log('─'.repeat(60), 'gray')
  log(`Total: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`, 'bright')
  log('')
  
  if (hasFailures) {
    log('❌ QA checks failed. See details above.', 'red')
    process.exit(1)
  } else {
    log('✅ All QA checks passed!', 'green')
    process.exit(0)
  }
}

// Main
async function main() {
  if (!jsonMode) {
    log(`\n${colors.bright}${colors.blue}🚀 KB Labs QA Runner${colors.reset}\n`)
  }
  
  try {
    // 1. Build (in correct order)
    if (!skipBuild) {
      await buildAllLayers()
    } else {
      log('⏭️  Skipping build (--skip-build)', 'yellow')
    }
    
    // 2. Lint
    if (!skipLint) {
      await runOnAllPackages('run lint', '🔍 Running linter', 'lint')
    } else {
      log('⏭️  Skipping lint (--skip-lint)', 'yellow')
    }
    
    // 3. Type check
    if (!skipTypes) {
      await runOnAllPackages('run type-check', '📘 Running type check', 'typeCheck')
    } else {
      log('⏭️  Skipping type-check (--skip-types)', 'yellow')
    }
    
    // 4. Tests
    if (!skipTests) {
      await runOnAllPackages('run test', '🧪 Running tests', 'test')
    } else {
      log('⏭️  Skipping tests (--skip-tests)', 'yellow')
    }
    
    // Load baseline and calculate diff
    const baseline = loadBaseline()
    const diff = calculateDiff(baseline)
    
    // Print report
    if (jsonMode) {
      printJsonReport(baseline, diff)
    } else {
      printHumanReport(baseline, diff)
    }
    
  } catch (err) {
    if (jsonMode) {
      console.log(JSON.stringify({ status: 'error', message: err.message }, null, 2))
    } else {
      log(`\n❌ QA runner failed: ${err.message}`, 'red')
    }
    process.exit(1)
  }
}

main()
