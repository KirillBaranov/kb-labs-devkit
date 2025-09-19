# ADR 0004: Fixtures for DevKit Validation

- **Status:** Accepted
- **Date:** 2025-09-21
- **Author:** KB Labs

## Context

@kb-labs/devkit acts as the single source of truth for KB Labs tooling (TS/ESLint/Prettier/Vitest/Tsup presets, reusable CI, agents).  
Consumers (templates, products) extend DevKit configs and expect them to "just work."

However, changes to DevKit (e.g., upgrading ESLint, adjusting TS options, changing exports) can easily break downstream repos. Unit tests inside DevKit itself are not enough, since they don't replicate the real-world consumption pattern.

We need a way to validate DevKit against representative consumer setups before shipping changes.

## Decision

We introduce fixtures inside DevKit (`/fixtures/*`) that act as minimal, real-world consumer projects:
- **fixtures/lib**: simple TypeScript library using DevKit presets (TS, ESLint, Prettier, Vitest, Tsup)
- **Future fixtures may include:**
  - `fixtures/cli` – minimal CLI app with tsup build + Vitest
  - `fixtures/vue` – minimal Vue app using Vite + DevKit configs

Each fixture has its own `package.json` and extends DevKit via imports/extends (no relative paths).

At DevKit root, we add scripts:
- `fixtures:bootstrap` → install fixture deps
- `fixtures:clean` → remove build artifacts
- `fixtures:lint` → run ESLint in fixtures
- `fixtures:type-check` → run TS type checks
- `fixtures:test` → run Vitest
- `fixtures:build` → tsup + d.ts emit
- `fixtures:check` → run all above

CI for DevKit adds a `fixtures-check` job that runs `pnpm fixtures:check`.

## Rationale

- **Realistic validation** → Fixtures mimic actual consumer usage of DevKit
- **Early detection** → Breakages in configs/exports are caught before affecting templates/products
- **CI-ready** → Any contributor can see instantly if their DevKit change breaks downstream

## Consequences

**Pros**
- Higher confidence in DevKit stability
- Consumers upgrade DevKit with fewer regressions
- Faster feedback loop for config/preset changes

**Cons**
- Adds some maintenance overhead (fixtures must be kept in sync)
- Slightly longer CI times (but acceptable)

## Operational Notes

- Fixtures are not published to npm
- They live inside `/fixtures` and are ignored by release builds
- Only minimal code is included (e.g., `sum.ts`, `smoke.spec.ts`)
- CI enforces `pnpm fixtures:check` on every PR to DevKit

## Alternatives Considered

- Relying only on DevKit unit tests → rejected (insufficient realism)
- Testing only in downstream repos → rejected (too slow, fragmented)

## Follow-ups

- Add additional fixture types (cli, vue)
- Automate fixture bootstrap in CI
- Consider nightly drift-check between DevKit and fixtures to catch stale configs

## References

- KB Labs DevKit: @kb-labs/devkit
- TypeScript: Module Resolution
- Vitest: Configuration
- tsup: Build Configuration
