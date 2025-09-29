# @kb-labs/devkit

[![npm version](https://img.shields.io/npm/v/@kb-labs/devkit.svg?style=flat-square)](https://www.npmjs.com/package/@kb-labs/devkit)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/Module-ESM-purple.svg?style=flat-square)](https://nodejs.org/api/esm.html)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

A cohesive set of presets and configurations for the `@kb-labs` ecosystem: TypeScript `tsconfig`, ESLint, Prettier, Vitest, Tsup, and reusable GitHub Actions. The goal is to maximize automation, enforce consistent standards, and eliminate copy-paste across new projects.

## Features

- **TypeScript** ![TypeScript](https://img.shields.io/badge/TypeScript-NodeNext-blue.svg?style=flat-square): ready-to-use `tsconfig` for libraries, Node services, and CLIs.
- **ESLint** ![ESLint](https://img.shields.io/badge/ESLint-9.0+-4B32C3.svg?style=flat-square): a base preset plus variations for lib/node/cli.
- **Prettier** ![Prettier](https://img.shields.io/badge/Prettier-Formatted-F7B93E.svg?style=flat-square): a single opinionated formatting profile.
- **Vitest** ![Vitest](https://img.shields.io/badge/Vitest-Testing-6E9F18.svg?style=flat-square): a base test/coverage profile with lib/node overlays.
- **Tsup** ![Tsup](https://img.shields.io/badge/Tsup-ESM%20Build-FF6B6B.svg?style=flat-square): standard builds for libraries and Node services.
- **GitHub Actions** ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Reusable-2088FF.svg?style=flat-square): reusable CI/PR/Release workflows.
- **AI Agents** ![AI](https://img.shields.io/badge/AI%20Agents-Cursor-00D4AA.svg?style=flat-square): standardized Cursor agents for common development tasks.
- **Fixtures** ![Fixtures](https://img.shields.io/badge/Fixtures-Validation-9C27B0.svg?style=flat-square): validation fixtures to ensure DevKit changes don't break downstream consumers.
- **Scripts** ![Scripts](https://img.shields.io/badge/Scripts-Automated-FF9800.svg?style=flat-square): automated fixture management for testing all presets.

## AI Agents

This DevKit includes pre-configured AI agents that can be synced into any KB Labs project. These agents are opinionated around KB Labs workflows (pnpm, devkit presets, monorepo). Outside this ecosystem, adapt accordingly.

| Agent              | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| **DevKit Maintainer** ![Maintainer](https://img.shields.io/badge/DevKit-Maintainer-2196F3.svg?style=flat-square) | Enforce unified tooling (tsconfig, eslint, prettier, vitest, tsup, CI) |
| **Test Generator** ![Tests](https://img.shields.io/badge/Test-Generator-4CAF50.svg?style=flat-square)    | Generate and maintain pragmatic unit tests                    |
| **Docs Drafter** ![Docs](https://img.shields.io/badge/Docs-Drafter-FF9800.svg?style=flat-square)      | Draft and update README/CONTRIBUTING/ADR docs                 |
| **Release Manager** ![Release](https://img.shields.io/badge/Release-Manager-9C27B0.svg?style=flat-square)   | Prepare release plans, changelog, and GitHub releases         |

Each agent includes:
- **Prompt**: AI instructions and context
- **Runbook**: step-by-step procedures
- **Context**: file patterns and permissions

To sync agents into your project:
```bash
# Copy agent definitions from this DevKit
pnpm agents:sync
```

They are designed for Cursor AI agents, but can also be adapted for GitHub Copilot Chat or other IDE assistants.

See [`AGENTS.md`](./AGENTS.md) for detailed agent documentation.

## Install

```bash
pnpm add -D @kb-labs/devkit
# or
npm i -D @kb-labs/devkit
```

## Quick start

- **Node project** (TS + Tsup + Vitest + ESLint + Prettier)
  - `tsconfig.json`:

```json
{
  "extends": "@kb-labs/devkit/tsconfig/node.json"
}
```

  - `tsup.config.ts`:

```ts
import config from '@kb-labs/devkit/tsup/node.js'
export default config
```

  - `vitest.config.ts`:

```ts
import config from '@kb-labs/devkit/vitest/node.js'
export default config
```

  - `eslint.config.js` (ESLint 9 flat config):

```js
import config from '@kb-labs/devkit/eslint/node.js'
export default config
```

  - `.prettierrc.json`:

```json
"@kb-labs/devkit/prettier/index.json"
```

  - `package.json` (example):

```json
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "lint": "eslint .",
    "test": "vitest",
    "format": "prettier -w ."
  }
}
```

## Preset details

### TypeScript (`tsconfig`)
Available configs:
- `base.json`: strict base (ES2022, NodeNext, strict typing, isolatedModules)
- `cli.json`: CLI application preset
- `lib.json`: library preset  
- `node.json`: Node service – declarations, source maps, `include: ["src"]`

All configs use `module: "NodeNext"` and `moduleResolution: "NodeNext"` for proper ESM support.

**Usage:**
```json
{
  "extends": "@kb-labs/devkit/tsconfig/node.json"
}
```

Or import specific files:
```json
{
  "extends": "@kb-labs/devkit/tsconfig/base.json"
}
```

### ESLint
- `eslint/node.js`: ESLint 9 flat config with TypeScript support.

Features:
- Uses `typescript-eslint` recommended rules
- Ignores `dist/`, `coverage/`, `node_modules/`, `.yalc/`
- Allows unused variables with `_` prefix
- Consistent type imports

Run:
```bash
pnpm eslint .
```

### Prettier
- `prettier/index.json`: shared style (no semicolons, single quotes, width 100).

Run:
```bash
pnpm prettier -c .
```

### Tsup
- `tsup/node.js`: ESM-only build (target ES2022, sourcemap, clean, treeshake).

Features:
- ESM format only
- ES2022 target
- Source maps enabled
- Tree shaking enabled
- Clean output directory

Run:
```bash
pnpm tsup
```

### Vitest
- `vitest/node.js`: Node environment with coverage support.

Features:
- Node environment
- Coverage with V8 provider (disabled by default)
- Excludes `node_modules/`, `dist/`, etc.
- Strict coverage thresholds when enabled

Run:
```bash
pnpm vitest
```

## Repository Synchronization ![Sync](https://img.shields.io/badge/Sync-Automated-00BCD4.svg?style=flat-square)

The DevKit includes a powerful sync system that allows you to keep your project up-to-date with the latest DevKit assets. This is especially useful for maintaining consistent tooling across KB Labs projects.

### Quick Sync

To sync DevKit assets into your project:

```bash
# Install the sync tool
pnpm add -D @kb-labs/devkit

# Run sync (creates/updates files)
npx kb-devkit-sync

# Check for drift without making changes
npx kb-devkit-sync --check

# Force overwrite existing files
npx kb-devkit-sync --force
```

### Sync Configuration

Create a `kb-labs.config.json` file in your project root to customize sync behavior:

```json
{
  "sync": {
    "enabled": true,
    "disabled": ["vscode"],
    "only": ["ci", "agents"],
    "scope": "managed-only",
    "force": false,
    "overrides": {
      "cursorrules": { "to": ".config/cursor/rules.json" }
    },
    "targets": {
      "workflows": {
        "from": ".github/workflows", 
        "to": ".github/workflows", 
        "type": "dir"
      }
    }
  }
}
```

#### Configuration Options

- **`enabled`**: Boolean to enable/disable sync entirely (default: true)
- **`disabled`**: Array of target names to skip during sync
- **`only`**: Array of target names to sync (if empty, syncs all enabled targets)
- **`scope`**: Drift detection mode: `"managed-only"` (default), `"strict"`, or `"all"`
- **`force`**: Boolean to force overwrite existing files (can be set in config or via `--force` flag)
- **`overrides`**: Override source paths, destination paths, or types for existing targets
- **`targets`**: Add custom sync targets with `from`, `to`, and `type` properties

#### Available Targets

By default, the sync tool includes these targets:
- **`agents`**: AI agent definitions → `kb-labs/agents/`
- **`cursorrules`**: Cursor AI rules → `.cursorrules`
- **`vscode`**: VS Code settings → `.vscode/settings.json`

#### Sync Commands

```bash
# Sync all targets
npx kb-devkit-sync

# Sync specific targets only
npx kb-devkit-sync agents cursorrules

# Check for drift (exit code 0 = no drift, 2 = drift found)
npx kb-devkit-sync --check

# Check with specific scope
npx kb-devkit-sync --check --scope=strict

# Dry run (show what would be synced without making changes)
npx kb-devkit-sync --dry-run

# Verbose output
npx kb-devkit-sync --verbose

# JSON output for scripting
npx kb-devkit-sync --json

# Sync only CI templates
npx kb-devkit-sync --ci-only

# Force overwrite with specific scope
npx kb-devkit-sync --force --scope=managed-only
```

#### Drift Detection Modes

The sync tool supports three drift detection modes:

- **`managed-only`** ![Managed](https://img.shields.io/badge/Scope-Managed%20Only-green.svg?style=flat-square) (default): Compare only files explicitly synced from DevKit. Safe for repositories with additional project-specific files.
- **`strict`** ![Strict](https://img.shields.io/badge/Scope-Strict-red.svg?style=flat-square): Compare entire target directories and flag unmanaged files as drift. Use when you want to ensure no extra files exist.
- **`all`** ![All](https://img.shields.io/badge/Scope-All-orange.svg?style=flat-square): Legacy mode that combines strict checking with unmanaged file detection.

#### Provenance Files

After each operation, DevKit creates provenance files in the `kb-labs/` directory:

- **`DEVKIT_SYNC.json`** - Created after sync operations, tracks what was synced
- **`DEVKIT_CHECK.json`** - Created after check operations, tracks drift analysis results

Both files contain:
- DevKit version and timestamp
- List of targets processed
- Drift detection scope used
- Detailed operation report (for check operations)

**Sync file example:**
```json
{
  "source": "@kb-labs/devkit",
  "version": "1.2.3",
  "when": "2025-01-28T12:00:00Z",
  "scope": "managed-only",
  "items": ["ci", "agents", "cursorrules"]
}
```

**Check file example:**
```json
{
  "source": "@kb-labs/devkit",
  "version": "1.2.3",
  "when": "2025-01-28T12:00:00Z",
  "scope": "managed-only",
  "items": ["ci", "agents", "cursorrules"],
  "report": {
    "schemaVersion": "2-min",
    "devkit": { "version": "1.2.3" },
    "summary": { "driftCount": 0 },
    "targets": [...]
  }
}
```

#### Configuration Examples

**Basic configuration** (disable VS Code settings):
```json
{
  "sync": {
    "disabled": ["vscode"]
  }
}
```

**Selective sync** (only sync specific targets):
```json
{
  "sync": {
    "only": ["ci", "agents"],
    "scope": "managed-only"
  }
}
```

**Strict mode** (flag unmanaged files as drift):
```json
{
  "sync": {
    "scope": "strict"
  }
}
```

**Custom paths** (move Cursor rules to config directory):
```json
{
  "sync": {
    "overrides": {
      "cursorrules": { "to": ".config/cursor/rules.json" }
    }
  }
}
```

**Add custom workflow sync**:
```json
{
  "sync": {
    "targets": {
      "workflows": {
        "from": ".github/workflows", 
        "to": ".github/workflows", 
        "type": "dir"
      }
    }
  }
}
```

**Force overwrite mode**:
```json
{
  "sync": {
    "force": true
  }
}
```

**Disable sync entirely**:
```json
{
  "sync": {
    "enabled": false
  }
}
```

**Complex configuration** (combine multiple options):
```json
{
  "sync": {
    "enabled": true,
    "disabled": ["vscode"],
    "only": ["ci", "agents"],
    "scope": "managed-only",
    "overrides": {
      "cursorrules": { "to": ".config/cursor/rules.json" },
      "agents": { "to": "tools/agents" }
    },
    "targets": {
      "workflows": {
        "from": ".github/workflows", 
        "to": ".github/workflows", 
        "type": "dir"
      },
      "docs": {
        "from": "docs/templates", 
        "to": "docs", 
        "type": "dir"
      }
    },
    "force": false
  }
}
```

### GitHub Actions Integration

Add a drift check to your CI to ensure your project stays in sync:

```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    uses: kb-labs/devkit/.github/workflows/ci.yml@main
    with:
      enable-drift-check: true
```

Or use the dedicated drift check workflow:

```yaml
name: Drift Check
on:
  workflow_dispatch: {}
  schedule:
    - cron: '0 3 * * *' # nightly
jobs:
  drift:
    uses: kb-labs/devkit/.github/workflows/drift-check.yml@main
```

## GitHub Actions ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Reusable-2088FF.svg?style=flat-square)

This repo provides both reusable workflows and template workflows for easy setup.

### Reusable Workflows

Use these workflows directly in your project via `workflow_call`:

- **CI** (`.github/workflows/ci.yml`) — Complete CI pipeline with drift check
- **Drift Check** (`.github/workflows/drift-check.yml`) — DevKit synchronization check
- **Release** (`.github/workflows/release.yml`) — Automated releases and publishing

### Workflow Templates

Copy and customize these templates from `workflows-templates/`:

- **`ci.yml`** — Basic CI workflow template
- **`drift-check.yml`** — DevKit drift check template  
- **`release.yml`** — Release workflow template
- **`sbom.yml`** — Software Bill of Materials template

### Quick Setup

**Option 1: Use templates (recommended for new projects)**
```bash
# Copy workflow templates to your project
cp workflows-templates/*.yml .github/workflows/
# Then customize as needed
```

**Option 2: Use reusable workflows directly**
```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    uses: kb-labs/devkit/.github/workflows/ci.yml@main
    with:
      node-version: '20'
      run-coverage: true
      enable-drift-check: true
```

**Option 3: Hybrid approach**
```yaml
name: CI
on: [push, pull_request]
jobs:
  call:
    uses: kb-labs/devkit/.github/workflows/ci.yml@main
    with:
      node-version: '20'
      run-coverage: true
```

### Available Workflow Inputs

**CI Workflow** (`.github/workflows/ci.yml`):
- `node-version` (default: '20') — Node.js version
- `run-coverage` (default: true) — Enable coverage reporting
- `enable-drift-check` (default: true) — Run DevKit drift check

**Drift Check Workflow** (`.github/workflows/drift-check.yml`):
- `node-version` (default: '20') — Node.js version

### Drift Check Integration

The drift check ensures your project stays synchronized with the latest DevKit assets:

```yaml
# In your CI workflow
jobs:
  ci:
    uses: kb-labs/devkit/.github/workflows/ci.yml@main
    with:
      enable-drift-check: true  # Fails CI if DevKit is out of sync
```

Or use the dedicated drift check workflow:
```yaml
name: Drift Check
on:
  workflow_dispatch: {}
  schedule:
    - cron: '0 3 * * *' # nightly
jobs:
  drift:
    uses: kb-labs/devkit/.github/workflows/drift-check.yml@main
```

> **Note**: When using `workflow_call`/`uses`, ensure your repo has access to the source repo and required secrets if the workflow needs them.

## Validation Fixtures ![Fixtures](https://img.shields.io/badge/Fixtures-Validation-9C27B0.svg?style=flat-square)

This DevKit includes fixtures (`/fixtures/*`) that act as minimal, real-world consumer projects to validate DevKit changes:

- **`fixtures/lib`**: A simple TypeScript library using DevKit presets
- **`fixtures/cli`**: A CLI application with Commander.js
- **`fixtures/web`**: A web application with DOM API and fetch
- **`fixtures/monorepo`**: A monorepo with shared library and app packages

Each fixture has its own `package.json` and extends DevKit via imports/extends (no relative paths).

### Fixture Management

Use the automated fixture management script:

```bash
# Check all fixtures (recommended for CI)
pnpm fixtures:check

# Check specific fixture
pnpm fixtures lib check
pnpm fixtures cli test
pnpm fixtures web build
pnpm fixtures monorepo lint

# Run specific action on all fixtures
pnpm fixtures:lint   # Lint all fixtures
pnpm fixtures:test   # Test all fixtures
pnpm fixtures:build  # Build all fixtures

# Show help
pnpm fixtures
```

The `fixtures:check` script runs all validation steps and is used in CI to ensure DevKit changes don't break downstream consumers.

See [`scripts/README.md`](./scripts/README.md) for detailed fixture management documentation.

## Architecture Decision Records (ADR) ![ADR](https://img.shields.io/badge/ADR-8%20Records-607D8B.svg?style=flat-square)

This DevKit follows architectural decision records to document important design decisions:

- **[ADR 0001: Repository Synchronization via DevKit](./docs/adr/0001-repo-synchronization-via-devkit.md)** - Strategy for maintaining consistent tooling across KB Labs projects
- **[ADR 0002: ESM-only and NodeNext](./docs/adr/0002-esm-only-and-nodenext.md)** - Decision to use ESM-only modules with NodeNext resolution
- **[ADR 0003: Validation Fixtures Strategy](./docs/adr/0003-validation-fixtures-strategy.md)** - Approach to testing DevKit presets with realistic consumer projects
- **[ADR 0004: Testing Strategy and Quality Gates](./docs/adr/0004-testing-strategy-and-quality-gates.md)** - Comprehensive testing approach with multiple validation layers
- **[ADR 0005: Build & Types Strategy for KB Labs Monorepos](./docs/adr/0005-build-strategy.md)** - Unified approach to build and type generation using tsup instead of separate TSC
- **[ADR 0006: Sequential Build & Type Safety in KB Labs Monorepos](./docs/adr/0006-monorepo-build-and-types.md)** - Orchestration of build order and dependency resolution in monorepos
- **[ADR 0007: Reusable Workflow Strategy for CI Synchronization](./docs/adr/0007-reusable-workflow-strategy.md)** - Centralized CI workflows and drift check strategy
- **[ADR 0008: Flexible Sync and Drift Management in DevKit](./docs/adr/0008-flexible-sync-strategy.md)** - Managed-only drift strategy with provenance tracking and flexible enforcement modes

## Use cases ![Use Cases](https://img.shields.io/badge/Use%20Cases-5%20Scenarios-795548.svg?style=flat-square)
- Bootstrap new packages/services without copying configs.
- Enforce consistent style and rules across the ecosystem.
- Provide a single minimal CI for PRs and releases.
- Migrate existing projects to shared presets with minimal effort.
- Validate DevKit changes against real-world usage patterns.

## Migration Guide ![Migration](https://img.shields.io/badge/Migration-Guide-3F51B5.svg?style=flat-square)

### Updating to Latest DevKit

To update your project to the latest DevKit version:

1. **Update the package**:
```bash
pnpm update @kb-labs/devkit
```

2. **Check for drift**:
```bash
npx kb-devkit-sync --check
```

3. **Sync changes** (if drift found):
```bash
npx kb-devkit-sync --force
```

4. **Review and commit changes**:
```bash
git add .
git commit -m "chore: update devkit to latest version"
```

### Migrating from Manual Setup

If you're migrating from manually copied configs to the sync system:

1. **Install DevKit**:
```bash
pnpm add -D @kb-labs/devkit
```

2. **Create sync configuration**:
```json
{
  "sync": {
    "disabled": ["vscode"], // if you don't want VS Code settings
    "overrides": {
      "cursorrules": { "to": ".cursorrules" } // customize paths as needed
    }
  }
}
```

3. **Run initial sync**:
```bash
npx kb-devkit-sync --force
```

4. **Remove old config files** and update imports to use DevKit presets

5. **Add drift check to CI**:
```yaml
jobs:
  ci:
    uses: kb-labs/devkit/.github/workflows/ci.yml@main
    with:
      enable-drift-check: true
```

## FAQ ![FAQ](https://img.shields.io/badge/FAQ-Common%20Questions-FF5722.svg?style=flat-square)

### General
- **Can I override rules?** — Yes. Extend locally and add your overrides on top.
- **How do I update?** — Bump `@kb-labs/devkit` and run `npx kb-devkit-sync --check` to see what changed.
- **ESLint 9 flat config?** — Yes, all ESLint configs use the new flat config format.
- **ESM only?** — Yes, all presets assume ESM. For CJS, add dual builds/transpilation in your project.
- **TypeScript errors with module resolution?** — Ensure you're using `module: "NodeNext"` in your tsconfig.
- **Importing specific files vs folders?** — Both are supported. Use `@kb-labs/devkit/tsconfig/node.json` for specific files or `@kb-labs/devkit/tsconfig/` for folder imports.

### Sync & Drift Detection
- **What is drift check?** — A feature that compares your project's DevKit assets with the latest version to detect outdated files.
- **Can I customize sync behavior?** — Yes, use `kb-labs.config.json` to disable targets, override paths, or add custom sync targets.
- **What are drift detection modes?** — Three modes: `managed-only` (default, safe for mixed repos), `strict` (flags unmanaged files), and `all` (legacy mode).
- **What are the provenance files?** — `kb-labs/DEVKIT_SYNC.json` tracks sync operations, `kb-labs/DEVKIT_CHECK.json` tracks drift check results. Both contain DevKit version, timestamp, targets, and scope used.
- **Why do I get false drift reports?** — Use `managed-only` scope to ignore project-specific files that aren't managed by DevKit.
- **Can I disable sync entirely?** — Yes, set `"enabled": false` in `kb-labs.config.json` or use `--help` to see all options.
- **How do I sync only specific targets?** — Use `"only": ["ci", "agents"]` in config or `npx kb-devkit-sync ci agents` on command line.
- **What's the difference between `--force` and `--check`?** — `--check` only compares files and reports drift, `--force` overwrites existing files during sync.

### CI Integration
- **How do I add drift check to CI?** — Use the reusable workflow with `enable-drift-check: true` or add the dedicated drift check workflow.
- **Can I use different drift modes in CI?** — Yes, set the `KB_DEVKIT_SYNC_SCOPE` environment variable or use `--scope` flag.
- **What exit codes does drift check return?** — 0 for no drift, 2 for drift found, 1 for errors.

## License ![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)
MIT. See `LICENSE`.
