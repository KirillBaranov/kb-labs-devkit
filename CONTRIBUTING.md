# Contributing to @kb-labs/devkit

Thank you for helping improve `@kb-labs/devkit`! This guide explains how to set up your environment, propose changes, and work with our CI and release flows.

## Principles
- **Automation first**: prefer codified, repeatable processes.
- **Consistency over variety**: align with existing presets and conventions.
- **Small, focused changes**: easier to review and ship.

## Getting started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Git

### Install
```bash
pnpm i
```

### Useful scripts
```bash
pnpm build         # build (noop for this repo, but kept for symmetry)
pnpm lint          # run ESLint
pnpm test          # run Vitest
yarn test:coverage # if a consumer repo uses coverage thresholds
pnpm format        # run Prettier write mode (if defined in consumer)
```

> Note: Some scripts (like `type-check`, `test:coverage`) are referenced inside reusable workflows for consumer repos. They may be optional or no-op here.

## Project structure
- `tsconfig/*` — TypeScript configs (base/lib/node/cli)
- `eslint/*` — ESLint presets (base/lib/node/cli)
- `prettier/index.json` — Prettier config
- `vitest/*` — Vitest base and overlays (lib/node)
- `tsup/*` — Tsup configs (lib/node)
- `agents/*` — AI agent definitions (prompts, runbooks, context)
- `.github/workflows/*` — Reusable GitHub workflows
- `.github/actions/setup-node-pnpm` — Reusable action for Node+pnpm setup

## AI Agents

This DevKit includes standardized AI agents for common development tasks. Each agent is defined in the `agents/` directory with:

- **`prompt.md`** — AI instructions and context
- **`runbook.md`** — step-by-step procedures  
- **`context.globs`** — file patterns for context (optional)
- **`permissions.yml`** — access permissions (optional)

### Available Agents

- **DevKit Maintainer** (`agents/devkit-maintainer/`) — Enforces unified tooling across projects
- **Test Generator** (`agents/test-generator/`) — Generates and maintains unit tests
- **Docs Drafter** (`agents/docs-drafter/`) — Drafts and updates documentation
- **Release Manager** (`agents/release-manager/`) — Manages releases and changelogs

### Working with Agents

When contributing to agent definitions:
- Keep prompts clear and actionable
- Update runbooks when procedures change
- Test agent prompts in real scenarios
- Maintain consistency across agent styles
- Always re-sync agents before major contributions (`pnpm agents:sync`). This ensures consistent prompts and permissions across repos.

See [`AGENTS.md`](./AGENTS.md) for detailed agent documentation.

## Branching model
- `main` is the default branch.
- Use short-lived feature branches: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`.

## Commits
- Prefer conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.
- Keep messages concise and meaningful; include context in the body if needed.

## Linting & tests
- Run `pnpm lint` and `pnpm test` locally before opening a PR.
- Keep unit tests deterministic and fast.
- For configuration changes, add minimal sample usage in README when relevant.

## Pull requests
- Keep PRs focused and under ~300 lines where possible.
- Include a brief summary of what and why.
- Link related issues if they exist.
- Expect the reusable PR workflow to run: install, build (best-effort), tests.

## CI
This repo provides reusable workflows:
- `reusable-ci` (`.github/workflows/ci.yml`) — checkout, setup Node+pnpm, install, lint, optional type-check, tests, optional coverage, build.
- `reusable-pr-check` (`.github/workflows/pr-check.yml`) — checkout, setup Node+pnpm, install, build (best-effort), tests.
- `reusable-release` (`.github/workflows/release.yml`) — build, create GitHub release, optional npm publish.

Consumers can call these via `workflow_call`:
```yaml
jobs:
  ci:
    uses: kb-labs/devkit/.github/workflows/ci.yml@main
    with:
      node-version: '20'
      os: 'ubuntu-latest'
      run-coverage: true
```

## Releases
- This repo’s release workflow is reusable. To release here:
  - Create and push a tag like `v0.1.0` to `main`.
  - The `reusable-release` job creates a GitHub Release and can publish to npm if `NPM_TOKEN` is provided and `publish: true` is set by the caller.
- For consumer repos, wire a release workflow that calls ours and passes `publish: true` when appropriate.

## Code style
- ESM-first, Node 20 as baseline runtime.
- Follow ESLint and Prettier presets from this repo whenever possible.
- Prefer explicit, readable code over clever shortcuts.

## Security
- Do not commit secrets. Use GitHub Environments/Secrets.
- Report vulnerabilities privately to the maintainers.

## Governance
- Maintainers have final review authority for presets and workflows.
- Breaking changes require a clear migration note in README and release notes.

## Questions
Open a GitHub Discussion or issue. PRs welcome!
