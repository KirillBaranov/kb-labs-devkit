# KB Labs DevKit (@kb-labs/devkit)

> **A cohesive set of presets and configurations for the `@kb-labs` ecosystem.** TypeScript `tsconfig`, ESLint, Prettier, Vitest, Tsup, and reusable GitHub Actions. The goal is to maximize automation, enforce consistent standards, and eliminate copy-paste across new projects.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision

KB Labs DevKit provides a cohesive set of presets and configurations for the `@kb-labs` ecosystem: TypeScript `tsconfig`, ESLint, Prettier, Vitest, Tsup, and reusable GitHub Actions. The goal is to maximize automation, enforce consistent standards, and eliminate copy-paste across new projects.

The project solves the problem of inconsistent tooling configurations across KB Labs projects by providing a single source of truth for all development tooling. Instead of copying configs between projects, developers can simply extend DevKit presets, ensuring consistency and reducing maintenance overhead.

This project is the foundation for all KB Labs tooling and is used by every project in the ecosystem. It includes a powerful sync system that automatically keeps projects up-to-date with the latest DevKit assets.

## 🚀 Quick Start

### Installation

```bash
pnpm add -D @kb-labs/devkit
# or
npm i -D @kb-labs/devkit
```

### Basic Setup

#### Node Project (TS + Tsup + Vitest + ESLint + Prettier)

**tsconfig.json:**
```json
{
  "extends": "@kb-labs/devkit/tsconfig/node.json"
}
```

**tsup.config.ts:**
```typescript
import config from '@kb-labs/devkit/tsup/node.js'
export default config
```

**vitest.config.ts:**
```typescript
import config from '@kb-labs/devkit/vitest/node.js'
export default config
```

**eslint.config.js** (ESLint 9 flat config):
```javascript
import config from '@kb-labs/devkit/eslint/node.js'
export default config
```

**.prettierrc.json:**
```json
"@kb-labs/devkit/prettier/index.json"
```

**package.json** (example):
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

> **Build Convention**: All KB Labs packages use `"build": "tsup"` as the standard convention. The `tsup` preset handles both JavaScript bundling and TypeScript declaration generation (`dts: true`). TypeScript `tsconfig.json` with `references` is for IDE support and type-checking only, not for build orchestration. See [ADR-0009](./docs/adr/0009-unified-build-convention.md) for details.

### Workspace Aliases

For monorepos, DevKit ships with `kb-devkit-paths` – a generator that scans the pnpm workspace and writes `tsconfig.paths.json` with all `@kb-labs/*` aliases. Recommended setup:

```json
{
  "extends": [
    "@kb-labs/devkit/tsconfig/node.json",
    "./tsconfig.paths.json"
  ],
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

Add scripts to your `package.json` so aliases stay fresh whenever DevKit sync runs:

```json
{
  "scripts": {
    "devkit:paths": "pnpm exec kb-devkit-paths",
    "predevkit:sync": "pnpm devkit:paths",
    "predevkit:sync:ci": "pnpm devkit:paths",
    "predevkit:check": "pnpm devkit:paths",
    "predevkit:force": "pnpm devkit:paths"
  }
}
```

Then generate aliases once:

```bash
pnpm run devkit:paths
```

### Repository Synchronization

Sync DevKit assets into your project:

```bash
# Run sync (creates/updates files)
npx kb-devkit-sync

# Check for drift without making changes
npx kb-devkit-sync --check

# Force overwrite existing files
npx kb-devkit-sync --force
```

## ✨ Features

- **TypeScript**: Ready-to-use `tsconfig` for libraries, Node services, and CLIs
- **ESLint**: ESLint 9 flat config with TypeScript support
- **Prettier**: Single opinionated formatting profile
- **Vitest**: Base test/coverage profile with lib/node overlays
- **Tsup**: Standard builds for libraries and Node services
- **GitHub Actions**: Reusable CI/PR/Release workflows
- **AI Agents**: Standardized Cursor agents for common development tasks
- **Fixtures**: Validation fixtures to ensure DevKit changes don't break downstream consumers
- **Repository Sync**: Automated synchronization system to keep projects up-to-date

## 📁 Repository Structure

```
kb-labs-devkit/
├── agents/                  # AI agent definitions
│   ├── devkit-maintainer/   # DevKit maintainer agent
│   ├── test-generator/      # Test generator agent
│   ├── docs-crafter/        # Documentation drafter agent
│   └── release-manager/     # Release manager agent
├── bin/                     # Executable scripts
│   └── devkit-sync.mjs      # Sync tool binary
├── eslint/                  # ESLint presets
├── fixtures/                # Validation fixtures
│   ├── lib/                 # Library fixture
│   ├── cli/                 # CLI fixture
│   ├── web/                 # Web app fixture
│   └── monorepo/            # Monorepo fixture
├── prettier/                # Prettier config
├── scripts/                 # Utility scripts
├── sync/                    # Sync system
├── tsconfig/                # TypeScript configs
├── tsup/                    # Tsup configs
├── vite/                    # Vite configs
├── vitest/                  # Vitest configs
└── docs/                    # Documentation
    └── adr/                  # Architecture Decision Records
```

### Directory Descriptions

- **`agents/`** - Pre-configured AI agent definitions for Cursor and other IDE assistants
- **`bin/`** - Executable scripts (sync tool)
- **`fixtures/`** - Validation fixtures that act as minimal, real-world consumer projects
- **`docs/`** - Documentation including ADRs and guides
- **Preset directories** (`tsconfig/`, `eslint/`, `prettier/`, `vitest/`, `tsup/`) - Tooling presets

## 📦 Presets

### TypeScript (`tsconfig`)

Available configs:
- `base.json`: strict base (ES2022, NodeNext, strict typing, isolatedModules)
- `cli.json`: CLI application preset
- `lib.json`: library preset  
- `node.json`: Node service – declarations, source maps, `include: ["src"]`
- `react-lib.json`: React library preset
- `react-app.json`: React application preset
- `test.json`: Test configuration preset

All configs use `module: "NodeNext"` and `moduleResolution: "NodeNext"` for proper ESM support.

**Usage:**
```json
{
  "extends": "@kb-labs/devkit/tsconfig/node.json"
}
```

### ESLint

- `eslint/node.js`: ESLint 9 flat config with TypeScript support
- `eslint/react.js`: ESLint 9 flat config with React support

Features:
- Uses `typescript-eslint` recommended rules
- Ignores `dist/`, `coverage/`, `node_modules/`, `.yalc/`
- Allows unused variables with `_` prefix
- Consistent type imports

### Prettier

- `prettier/index.json`: shared style (no semicolons, single quotes, width 100)

### Tsup

- `tsup/node.js`: ESM-only build (target ES2022, sourcemap, clean, treeshake)
- `tsup/react-lib.js`: React library build preset

Features:
- ESM format only
- ES2022 target
- Source maps enabled
- Tree shaking enabled
- Clean output directory
- Automatic `external` list generated from `dependencies` + `peerDependencies`

### Vitest

- `vitest/node.js`: Node environment with coverage support
- `vitest/react.js`: React environment with coverage support

Features:
- Node/React environment
- Coverage with V8 provider (disabled by default)
- Excludes `node_modules/`, `dist/`, etc.
- Strict coverage thresholds when enabled

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm fixtures:check` | Check all fixtures (recommended for CI) |
| `pnpm fixtures:lint` | Lint all fixtures |
| `pnpm fixtures:test` | Test all fixtures |
| `pnpm fixtures:build` | Build all fixtures |
| `pnpm fixtures:bootstrap` | Bootstrap all fixtures |
| `pnpm fixtures:clean` | Clean all fixtures |
| `pnpm fixtures:ci` | Run fixtures check for CI |

## 📋 Development Policies

- **Code Style**: ESLint + Prettier, TypeScript strict mode
- **Testing**: Vitest with fixtures for integration testing
- **Versioning**: SemVer with automated releases through Changesets
- **Architecture**: Document decisions in ADRs (see `docs/adr/`)
- **Preset Stability**: Presets maintain backward compatibility
- **Sync System**: Automated drift detection and synchronization

## 🔧 Requirements

- **Node.js**: >= 18.18.0
- **pnpm**: >= 9.0.0

## ⚙️ Configuration

### Repository Synchronization

The DevKit includes a powerful sync system that allows you to keep your project up-to-date with the latest DevKit assets. This is especially useful for maintaining consistent tooling across KB Labs projects.

#### Quick Sync

```bash
# Run sync (creates/updates files)
npx kb-devkit-sync

# Check for drift without making changes
npx kb-devkit-sync --check

# Force overwrite existing files
npx kb-devkit-sync --force
```

#### Sync Configuration

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
- **`agents`**: AI agent definitions → `.kb/devkit/agents/`
- **`cursorrules`**: Cursor AI rules → `.cursorrules`
- **`vscode`**: VS Code settings → `.vscode/settings.json`

#### Drift Detection Modes

The sync tool supports three drift detection modes:

- **`managed-only`** (default): Compare only files explicitly synced from DevKit. Safe for repositories with additional project-specific files.
- **`strict`**: Compare entire target directories and flag unmanaged files as drift. Use when you want to ensure no extra files exist.
- **`all`**: Legacy mode that combines strict checking with unmanaged file detection.

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

## 🤖 AI Agents

This DevKit includes pre-configured AI agents that can be synced into any KB Labs project. These agents are opinionated around KB Labs workflows (pnpm, devkit presets, monorepo). Outside this ecosystem, adapt accordingly.

| Agent | Purpose |
|-------|---------|
| **DevKit Maintainer** | Enforce unified tooling (tsconfig, eslint, prettier, vitest, tsup, CI) |
| **Test Generator** | Generate and maintain pragmatic unit tests |
| **Docs Drafter** | Draft and update README/CONTRIBUTING/ADR docs |
| **Release Manager** | Prepare release plans, changelog, and GitHub releases |

Each agent includes:
- **Prompt**: AI instructions and context
- **Runbook**: step-by-step procedures
- **Context**: file patterns and permissions

To sync agents into your project:
```bash
# Copy agent definitions from this DevKit
npx kb-devkit-sync agents
```

They are designed for Cursor AI agents, but can also be adapted for GitHub Copilot Chat or other IDE assistants.

See [`AGENTS.md`](./AGENTS.md) for detailed agent documentation.

## 🧪 Validation Fixtures

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

## 📚 Documentation

- [Documentation Standard](./docs/DOCUMENTATION.md) - Full documentation guidelines
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Architecture Decisions](./docs/adr/) - ADRs for this project

**Guides:**
- [AI Agents](./AGENTS.md) - AI agent documentation
- [Fixture Management](./scripts/README.md) - Fixture management documentation

**Architecture:**
- [ADR 0001: Repository Synchronization via DevKit](./docs/adr/0001-repo-synchronization-via-devkit.md) - Strategy for maintaining consistent tooling
- [ADR 0002: ESM-only and NodeNext](./docs/adr/0002-esm-only-and-nodenext.md) - ESM-only modules with NodeNext resolution
- [ADR 0003: Validation Fixtures Strategy](./docs/adr/0003-validation-fixtures-strategy.md) - Testing DevKit presets with realistic consumer projects
- [ADR 0004: Testing Strategy and Quality Gates](./docs/adr/0004-testing-strategy-and-quality-gates.md) - Comprehensive testing approach
- [ADR 0005: Build & Types Strategy](./docs/adr/0005-build-strategy.md) - Unified approach to build and type generation
- [ADR 0006: Sequential Build & Type Safety](./docs/adr/0006-monorepo-build-and-types.md) - Build order and dependency resolution
- [ADR 0007: Reusable Workflow Strategy](./docs/adr/0007-reusable-workflow-strategy.md) - Centralized CI workflows and drift check
- [ADR 0008: Flexible Sync and Drift Management](./docs/adr/0008-flexible-sync-strategy.md) - Managed-only drift strategy with provenance tracking

## 🔗 Related Packages

### Dependencies

- None (devkit is a foundation package)

### Used By

- [@kb-labs/core](https://github.com/KirillBaranov/kb-labs-core) - Core utilities
- [@kb-labs/cli](https://github.com/KirillBaranov/kb-labs-cli) - CLI framework
- [@kb-labs/audit](https://github.com/KirillBaranov/kb-labs-audit) - Audit framework
- [@kb-labs/ai-review](https://github.com/KirillBaranov/kb-labs-ai-review) - AI Review
- All other KB Labs projects

### Ecosystem

- [KB Labs](https://github.com/KirillBaranov/kb-labs) - Main ecosystem repository

## 💡 Use Cases

- Bootstrap new packages/services without copying configs
- Enforce consistent style and rules across the ecosystem
- Provide a single minimal CI for PRs and releases
- Migrate existing projects to shared presets with minimal effort
- Validate DevKit changes against real-world usage patterns

## 📖 Migration Guide

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
    "disabled": ["vscode"],
    "overrides": {
      "cursorrules": { "to": ".cursorrules" }
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

## ❓ FAQ

### General

- **Can I override rules?** — Yes. Extend locally and add your overrides on top.
- **How do I update?** — Bump `@kb-labs/devkit` and run `npx kb-devkit-sync --check` to see what changed.
- **ESLint 9 flat config?** — Yes, all ESLint configs use the new flat config format.
- **ESM only?** — Yes, all presets assume ESM. For CJS, add dual builds/transpilation in your project.
- **TypeScript errors with module resolution?** — Ensure you're using `module: "NodeNext"` in your tsconfig.
- **Importing specific files vs folders?** — Both are supported. Use `@kb-labs/devkit/tsconfig/node.json` for specific files or `
