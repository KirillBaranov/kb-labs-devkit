# @kb-labs/devkit

A cohesive set of presets and configurations for the `@kb-labs` ecosystem: TypeScript `tsconfig`, ESLint, Prettier, Vitest, Tsup, and reusable GitHub Actions. The goal is to maximize automation, enforce consistent standards, and eliminate copy-paste across new projects.

## Features

- **TypeScript**: ready-to-use `tsconfig` for libraries, Node services, and CLIs.
- **ESLint**: a base preset plus variations for lib/node/cli.
- **Prettier**: a single opinionated formatting profile.
- **Vitest**: a base test/coverage profile with lib/node overlays.
- **Tsup**: standard builds for libraries and Node services.
- **GitHub Actions**: reusable CI/PR/Release workflows.
- **AI Agents**: standardized Cursor agents for common development tasks.
- **Fixtures**: validation fixtures to ensure DevKit changes don't break downstream consumers.
- **Scripts**: automated fixture management for testing all presets.

## AI Agents

This DevKit includes pre-configured AI agents that can be synced into any KB Labs project. These agents are opinionated around KB Labs workflows (pnpm, devkit presets, monorepo). Outside this ecosystem, adapt accordingly.

| Agent              | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| **DevKit Maintainer** | Enforce unified tooling (tsconfig, eslint, prettier, vitest, tsup, CI) |
| **Test Generator**    | Generate and maintain pragmatic unit tests                    |
| **Docs Drafter**      | Draft and update README/CONTRIBUTING/ADR docs                 |
| **Release Manager**   | Prepare release plans, changelog, and GitHub releases         |

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

## GitHub Actions
This repo includes reusable workflows and actions (see `.github/workflows`). Recommended minimal set:

- CI (lint, tests):
```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    uses: kb-labs/devkit/.github/workflows/ci.yml@main
```

- PR Check (quick PR validation):
```yaml
name: PR Check
on:
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  pr-check:
    uses: kb-labs/devkit/.github/workflows/pr-check.yml@main
```

- Release (semantic-style tags):
```yaml
name: Release
on:
  push:
    tags:
      - 'v*.*.*'
jobs:
  release:
    uses: kb-labs/devkit/.github/workflows/release.yml@main
```

> Note: when using `workflow_call`/`uses`, ensure your repo has access to the source repo and required secrets if the workflow needs them.

## Validation Fixtures

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

## Architecture Decision Records (ADR)

This DevKit follows architectural decision records to document important design decisions:

- **[ADR 0001: Repository Synchronization via DevKit](./docs/adr/0001-repo-synchronization-via-devkit.md)** - Strategy for maintaining consistent tooling across KB Labs projects
- **[ADR 0002: ESM-only and NodeNext](./docs/adr/0002-esm-only-and-nodenext.md)** - Decision to use ESM-only modules with NodeNext resolution
- **[ADR 0003: Validation Fixtures Strategy](./docs/adr/0003-validation-fixtures-strategy.md)** - Approach to testing DevKit presets with realistic consumer projects
- **[ADR 0004: Testing Strategy and Quality Gates](./docs/adr/0004-testing-strategy-and-quality-gates.md)** - Comprehensive testing approach with multiple validation layers
- **[ADR 0005: Build & Types Strategy for KB Labs Monorepos](./docs/adr/0005-build-strategy.md)** - Unified approach to build and type generation using tsup instead of separate TSC

## Use cases
- Bootstrap new packages/services without copying configs.
- Enforce consistent style and rules across the ecosystem.
- Provide a single minimal CI for PRs and releases.
- Migrate existing projects to shared presets with minimal effort.
- Validate DevKit changes against real-world usage patterns.

## FAQ
- **Can I override rules?** — Yes. Extend locally and add your overrides on top.
- **How do I update?** — Bump `@kb-labs/devkit` and review the release notes/Changelog.
- **ESLint 9 flat config?** — Yes, all ESLint configs use the new flat config format.
- **ESM only?** — Yes, all presets assume ESM. For CJS, add dual builds/transpilation in your project.
- **TypeScript errors with module resolution?** — Ensure you're using `module: "NodeNext"` in your tsconfig.
- **Importing specific files vs folders?** — Both are supported. Use `@kb-labs/devkit/tsconfig/node.json` for specific files or `@kb-labs/devkit/tsconfig/` for folder imports.

## License
MIT. See `LICENSE`.
