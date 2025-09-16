# @kb-labs/devkit

A cohesive set of presets and configurations for the `@kb-labs` ecosystem: TypeScript `tsconfig`, ESLint, Prettier, Vitest, Tsup, and reusable GitHub Actions. The goal is to maximize automation, enforce consistent standards, and eliminate copy-paste across new projects.

## Features

- **TypeScript**: ready-to-use `tsconfig` for libraries, Node services, and CLIs.
- **ESLint**: a base preset plus variations for lib/node/cli.
- **Prettier**: a single opinionated formatting profile.
- **Vitest**: a base test/coverage profile with lib/node overlays.
- **Tsup**: standard builds for libraries and Node services.
- **GitHub Actions**: reusable CI/PR/Release workflows.

## Install

```bash
pnpm add -D @kb-labs/devkit
# or
npm i -D @kb-labs/devkit
```

## Quick start

- **Library project** (TS + Tsup + Vitest + ESLint + Prettier)
  - `tsconfig.json`:

```json
{
  "extends": "@kb-labs/devkit/tsconfig/lib.json"
}
```

  - `tsup.config.ts`:

```ts
import config from '@kb-labs/devkit/tsup/lib'
export default config
```

  - `vitest.config.ts`:

```ts
import config from '@kb-labs/devkit/vitest/lib'
export default config
```

  - `.eslintrc.cjs`:

```js
module.exports = {
  extends: [require.resolve('@kb-labs/devkit/eslint/lib.cjs')],
}
```

  - `.prettierrc.json` (optional – you can also reference the preset directly):

```json
"@kb-labs/devkit/prettier/index.json"
```

  - `package.json` (example):

```json
{
  "type": "module",
  "scripts": {
    "build": "tsup",
    "lint": "eslint .",
    "test": "vitest",
    "format": "prettier -w ."
  }
}
```

- **Node service / CLI**
  - `tsconfig.json`:

```json
{
  "extends": "@kb-labs/devkit/tsconfig/node.json"
}
```

  - `tsup.config.ts`:

```ts
import config from '@kb-labs/devkit/tsup/node'
export default config
```

  - `vitest.config.ts`:

```ts
import config from '@kb-labs/devkit/vitest/node'
export default config
```

  - `.eslintrc.cjs` (service):

```js
module.exports = {
  extends: [require.resolve('@kb-labs/devkit/eslint/node.cjs')],
}
```

  - `.eslintrc.cjs` (CLI):

```js
module.exports = {
  extends: [require.resolve('@kb-labs/devkit/eslint/cli.cjs')],
}
```

## Preset details

### TypeScript (`tsconfig`)
- `base.json`: strict base (ES2022, NodeNext, strict typing).
- `lib.json`: library – declarations, source maps, `include: ["src"]`.
- `node.json`: Node service – declarations, source maps, `include: ["src", "bin"]`.
- `cli.json`: CLI – declarations, `include: ["src"]`.

### ESLint
- `eslint/base.cjs`: base TypeScript rules.
- `eslint/lib.cjs`: library flavor (allows `any` for gradual adoption).
- `eslint/node.cjs`: Node service profile.
- `eslint/cli.cjs`: CLI profile (allows `console`, `process.exit`).

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
- `tsup/lib.ts`: library build (ESM, dts, sourcemap, treeshake).
- `tsup/node.ts`: Node service build (target node20, ESM, dts, sourcemap).

Run:
```bash
pnpm tsup
```

### Vitest
- `vitest/base.ts`: base tests + coverage (V8, strict thresholds).
- `vitest/lib.ts`: library overlay.
- `vitest/node.ts`: Node overlay.

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

## Use cases
- Bootstrap new packages/services without copying configs.
- Enforce consistent style and rules across the ecosystem.
- Provide a single minimal CI for PRs and releases.
- Migrate existing projects to shared presets with minimal effort.

## FAQ
- **Can I override rules?** — Yes. Extend locally and add your overrides on top.
- **How do I update?** — Bump `@kb-labs/devkit` and review the release notes/Changelog.
- **Need CommonJS?** — Presets assume ESM. For CJS, add dual builds/transpilation in your project.

## License
MIT. See `LICENSE`.
