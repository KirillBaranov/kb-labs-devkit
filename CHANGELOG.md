# Changelog — @kb-labs/devkit

## 1.0.0 — 2026-02-24

First stable release. Prior history represents internal R&D — this is the first versioned public release.

### Package

| Package | Version |
|---------|---------|
| `@kb-labs/devkit` | 1.0.0 |

### What's included

**`@kb-labs/devkit`** — Shared developer toolkit for KB Labs projects. Provides TypeScript/ESLint/Prettier/Vitest presets, build configuration, and a suite of monorepo management tools.

#### Presets

- **`@kb-labs/devkit/tsconfig/*`** — TypeScript configs: `base`, `lib`, `node`, `cli`, `react-lib`, `react-app`, `test`
- **`@kb-labs/devkit/eslint/node`** — ESLint flat config for Node.js packages
- **`@kb-labs/devkit/eslint/react`** — ESLint flat config for React packages
- **`@kb-labs/devkit/tsup/*`** — tsup build presets: `node`, `bin`, `dual`, `sdk`, `react-lib`
- **`@kb-labs/devkit/vitest/node`** — Vitest config for Node.js packages
- **`@kb-labs/devkit/vitest/react`** — Vitest config for React packages
- **`@kb-labs/devkit/prettier`** — Prettier config

#### CLI tools (bin)

| Command | Description |
|---------|-------------|
| `kb-devkit-qa` | Full QA runner — build, lint, type-check, tests with smart hash-based caching |
| `kb-devkit-core-gate` | Platform core gate — checks 6 core monorepos meet zero-error requirements |
| `kb-devkit-ci` | Run all checks in one command (naming, imports, exports, structure, paths, types) |
| `kb-devkit-build-order` | Calculate correct build order with dependency layers |
| `kb-devkit-types-order` | Calculate correct TypeScript types generation order |
| `kb-devkit-types-audit` | Deep type safety audit across all packages |
| `kb-devkit-check-imports` | Find broken imports, unused deps, circular dependencies |
| `kb-devkit-check-exports` | Find unused exports and dead code |
| `kb-devkit-check-duplicates` | Find duplicate dependencies |
| `kb-devkit-check-structure` | Validate package structure |
| `kb-devkit-check-paths` | Validate workspace paths and references |
| `kb-devkit-check-types` | Ensure all packages generate .d.ts |
| `kb-devkit-check-commands` | Verify all CLI commands work |
| `kb-devkit-check-configs` | Validate configs consistency |
| `kb-devkit-check-scripts` | Validate package scripts |
| `kb-devkit-validate-naming` | Enforce Pyramid Rule naming convention |
| `kb-devkit-health` | Comprehensive health check with A-F grade |
| `kb-devkit-stats` | Monorepo statistics and health score |
| `kb-devkit-fix-deps` | Auto-fix dependency issues |
| `kb-devkit-architecture` | Architecture analysis and visualization |
| `kb-devkit-visualize` | Dependency graph visualization |
| `kb-devkit-freshness` | Check package freshness |
| `kb-devkit-sync` | Sync DevKit assets across projects |
| `kb-devkit-paths` | Generate workspace path aliases |
| `kb-devkit-tsup-external` | Generate external dependencies list |
| `kb-devkit-qa-history` | View QA run history and trends |

#### QA caching

`kb-devkit-qa` uses SHA256-based caching — skips unchanged packages on repeated runs:
- Cold run (first time or after changes): runs all affected packages
- Warm run (nothing changed): ~2 seconds total
- Results written to `.qa-cache/last-run.json` for consumption by `kb-devkit-core-gate`

### Notes

- Requires Node.js ≥ 20 and pnpm ≥ 9.11
- All presets are zero-config — drop-in replacements for manual configurations
- `kb-devkit-qa` is the recommended replacement for per-package `pnpm test/lint/tsc` in CI
