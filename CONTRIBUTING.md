# Contributing to confidential-Agent

## Commit convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.
Every commit message must have the form:

```
<type>[optional scope]: <description>

[optional body]

[optional footer: BREAKING CHANGE: <description>]
```

Recognized types:

| Type | Effect on changelog |
|------|---------------------|
| `feat` | Listed under **Features** |
| `fix` | Listed under **Bug Fixes** |
| `perf` | Listed under **Performance Improvements** |
| `refactor` | Hidden |
| `test` | Hidden |
| `chore` | Hidden |
| `docs` | Hidden |

A commit whose body or footer contains `BREAKING CHANGE:` will be highlighted at the top of the changelog section and will trigger a major version bump.

Examples:

```
feat(auth): add OAuth2 login flow
fix(api): handle empty response from /check endpoint
feat!: drop support for manifest v2

BREAKING CHANGE: browser-extension now requires Chrome 110+
```

## Releasing

Releases are **manual** — CI does not auto-release. Only maintainers should trigger a release from a clean `main` branch.

### Commands

```bash
# Preview the next release without writing anything
npm run release:dry

# Patch release (bug fixes — 0.1.0 → 0.1.1)
npm run release

# Minor release (new features — 0.1.0 → 0.2.0)
npm run release:minor

# Major release (breaking changes — 0.1.0 → 1.0.0)
npm run release:major
```

### What each release does

1. Bumps the version in `package.json` (root).
2. Runs `scripts/sync-versions.js` (via the `after:bump` hook) which propagates the version to:
   - `apps/admin-dashboard/package.json`
   - `apps/browser-extension/package.json`
   - `apps/browser-extension/manifest.json`
   - `packages/shared-types/package.json`
   - `services/security-api/pyproject.toml`
3. Appends a new section to `CHANGELOG.md` with commits grouped by type.
4. Creates a git commit (`chore: release vX.Y.Z`) and a git tag (`vX.Y.Z`).
5. Publishes a GitHub Release with the changelog content.

A `GITHUB_TOKEN` environment variable with `repo` scope must be available for step 5.

## CHANGELOG format

`CHANGELOG.md` is generated automatically — do not edit it by hand.
The format produced by `@release-it/conventional-changelog` looks like:

```markdown
## [0.2.0] - 2026-06-01

### Features

- add OAuth2 login flow (#42)

### Bug Fixes

- handle empty response from /check endpoint (#38)
```

Breaking changes appear as a dedicated **Breaking Changes** section above all other sections.
