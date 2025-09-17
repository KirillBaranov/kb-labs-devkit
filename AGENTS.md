# KB Labs Agents

The following agents are standardized across KB Labs projects. They live in this DevKit and can be synced into any repo.

| Agent              | Folder                         | Purpose                                                        |
|--------------------|--------------------------------|----------------------------------------------------------------|
| DevKit Maintainer  | `agents/devkit-maintainer`     | Enforce unified tooling (tsconfig, eslint, prettier, vitest, tsup, CI). |
| Test Generator     | `agents/test-generator`        | Generate and maintain pragmatic unit tests.                    |
| Docs Drafter       | `agents/docs-drafter`          | Draft and update README/CONTRIBUTING/ADR docs.                 |
| Release Manager    | `agents/release-manager`       | Prepare release plans, changelog, and GitHub releases.         |

> These are **descriptions and prompts** to bootstrap Cursor Agents quickly.  
> Use the `agents:sync` command in product repos to copy the latest agent definitions from this DevKit.
