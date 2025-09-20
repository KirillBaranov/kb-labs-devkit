#!/usr/bin/env node

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

const fixtures = ['lib', 'cli', 'web', 'monorepo']

function runCommand(command, fixture = null) {
  const cwd = fixture ? join(rootDir, 'fixtures', fixture) : rootDir
  console.log(`\n🔧 Running: ${command}${fixture ? ` in ${fixture}` : ''}`)
  try {
    execSync(command, { cwd, stdio: 'inherit' })
  } catch (error) {
    console.error(`❌ Command failed: ${command}`)
    process.exit(1)
  }
}

function runForFixture(fixture, action) {
  const commands = {
    bootstrap: `pnpm i`,
    clean: `pnpm clean`,
    lint: `pnpm lint`,
    'type-check': `pnpm type-check`,
    test: `pnpm test`,
    build: `pnpm build`,
    check: `pnpm lint && pnpm type-check && pnpm test && pnpm build`
  }

  if (action === 'check' && fixture === 'monorepo') {
    // Специальная логика для монорепозитория
    runCommand('pnpm -r lint', 'monorepo')
    runCommand('pnpm -r build', 'monorepo')
    runCommand('pnpm -r type-check', 'monorepo')
    runCommand('pnpm -r test', 'monorepo')
  } else if (action === 'check' && fixture === 'cli') {
    // CLI нужно собрать перед тестами
    runCommand('pnpm lint', fixture)
    runCommand('pnpm type-check', fixture)
    runCommand('pnpm build', fixture)
    runCommand('pnpm test', fixture)
  } else {
    const command = commands[action]
    if (!command) {
      console.error(`❌ Unknown action: ${action}`)
      process.exit(1)
    }
    runCommand(command, fixture)
  }
}

function runForAllFixtures(action) {
  console.log(`\n🚀 Running ${action} for all fixtures...`)
  for (const fixture of fixtures) {
    console.log(`\n📦 Processing ${fixture} fixture...`)
    runForFixture(fixture, action)
  }
  console.log(`\n✅ All fixtures ${action} completed!`)
}

// Парсинг аргументов
const args = process.argv.slice(2)
const [fixture, action] = args

if (!fixture || !action) {
  console.log(`
🔧 Fixtures Management Script

Usage:
  node scripts/fixtures.js <fixture> <action>
  node scripts/fixtures.js all <action>

Fixtures:
  ${fixtures.join(', ')}, all

Actions:
  bootstrap, clean, lint, type-check, test, build, check

Examples:
  node scripts/fixtures.js lib check
  node scripts/fixtures.js all lint
  node scripts/fixtures.js monorepo build
`)
  process.exit(1)
}

if (fixture === 'all') {
  runForAllFixtures(action)
} else if (fixtures.includes(fixture)) {
  runForFixture(fixture, action)
} else {
  console.error(`❌ Unknown fixture: ${fixture}`)
  console.error(`Available fixtures: ${fixtures.join(', ')}`)
  process.exit(1)
}
