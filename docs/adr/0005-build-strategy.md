# ADR 0005: Build & Types Strategy for KB Labs Monorepos

- **Status:** Accepted
- **Date:** 2025-09-24
- **Author:** KB Labs Team

## Context
We maintain several monorepositories (core/cli/shared/... + products). Previously, type generation went through `tsc --emitDeclarationOnly`, while JS bundling was through tsup. Several repositories encountered problems:

- Desynchronization of NodeNext/moduleResolution settings and workspace dependencies
- Config duplication (separate tsconfig.types.json files)
- Path incompatibilities and d.ts resolution nuances between packages

However, tsup can generate declarations (`dts: true`) and reliably solves cross-package type dependencies in combination with ESM and workspaces.

## Decision
1. **Unified approach**: Generate types through tsup (DevKit preset `tsup/node` has `dts: true` enabled by default).
2. **No separate TSC for d.ts**: We do not use `tsc --emitDeclarationOnly` (except in rare cases).
3. **Public API**: Each package exposes via `src/index.ts` (single re-export point).
4. **ESM-only**: We use ESM, without requiring file extensions in import paths (relying on the bundler).
5. **DevKit presets as source of truth**: TypeScript/ESLint/Prettier/Vitest/Tsup configs come from `@kb-labs/devkit` (minimal overrides in consumers).
6. **CI setup Node/pnpm**: DevKit composite-action configures Node + pnpm via corepack (without early `cache: pnpm`), then enables cache.

## Rationale
- **Stable d.ts in monorepos**: tsup(dts) removes the main pain of type resolution between packages.
- **Fewer configs and duplicates**: one tool handles both JS and types → easier to maintain.
- **Predictable ESM**: we avoid CJS/ESM mixes and extension quirks.
- **Centralized knowledge**: DevKit as single standard, templates and products only "connect".

## Consequences
**Pros**
- Simplified build process and fewer failure points.
- Consistent public API through `src/index.ts`.
- Fast migrations thanks to centralized presets.

**Cons**
- In rare cases (e.g., heavy type generators) manual `tsc --emitDeclarationOnly` may be needed — then the package explicitly disables `dts: true` and documents the reason.
- Strict dependency on DevKit presets requires careful DevKit versioning.

## Operational Notes
- **Tsup preset**: `@kb-labs/devkit/tsup/node` has `dts: true` by default; locally disabling dts is allowed when necessary.
- **TS Config**: consumers extend devkit presets; we avoid local paths/baseUrl unless critical.
- **ESLint**: preset doesn't enforce file extensions in imports (relying on bundler).
- **CI Action**: setup-node-pnpm from DevKit doesn't use `cache: pnpm` before installing pnpm; corepack activates the required version.

## Migration Plan
1. Remove local `tsc --emitDeclarationOnly` steps from build scripts.
2. Enable `dts: true` (if not coming from DevKit by default).
3. Verify that public surface is fully re-exported from `src/index.ts`.
4. Reduce local tsconfig to minimal overrides, inherit from DevKit.
5. Update CI to DevKit reusable workflows and updated composite-action.

## Alternatives Considered
- **TSC-only (without tsup)**: more configs, complex ESM bindings, lower speed.
- **Mixed approach (tsup JS + tsc d.ts)**: works, but creates fragility in monorepos (two truths, more drift).
- **CJS/ESM hybrid**: increases complexity and maintenance cost without clear benefit.

## Follow-ups
- Automated fixture tests in DevKit (consumer fixture) as mandatory check before DevKit release.
- Documentation "why we don't require extensions in imports" (ESM + bundler rationale).
- Guide "when manual `tsc --emitDeclarationOnly` is acceptable and how to properly enable it".
