# Branch Strategy

## Branch model

```
main ──────────────────────────────────────── production (protected)
  │
  └── develop ─────────────────────────────── integration (protected)
        │
        ├── feature/my-feature ─────────────── new features
        ├── fix/bug-description ────────────── bug fixes
        └── release/v0.2.0 ─────────────────── stabilization before release
```

## Rules

| Branch | Push directly | Requires PR | Tests required | Who merges |
|--------|--------------|-------------|----------------|------------|
| `main` | No | Yes | Yes | You, after review |
| `develop` | No | Yes | Yes | You, after review |
| `feature/*` | Yes | No | No | You |
| `fix/*` | Yes | No | No | You |
| `release/*` | Yes | No | No | You |

## Daily workflow

```bash
# 1. Start from develop (always up to date)
git checkout develop && git pull

# 2. Create a feature branch
git checkout -b feature/my-feature

# 3. Work, commit
git add .
git commit -m "feat: add my feature"

# 4. Push and open a PR → develop
git push origin feature/my-feature
# Open PR on GitHub: feature/my-feature → develop

# 5. After merge into develop, the next release:
git checkout develop && git pull
git checkout -b release/v0.2.0

# 6. Final tests, version bump
# Edit package.json version → "0.2.0"
git commit -am "chore: bump version to 0.2.0"

# 7. Merge release/v0.2.0 → main (via PR)
# Then tag on main:
git checkout main && git pull
git tag v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
# → triggers the Release workflow automatically

# 8. Merge main back into develop (to sync the version bump)
git checkout develop
git merge main
git push origin develop
```

## Commit message convention (Conventional Commits)

```
feat: add anonymization for email addresses
fix: correct JWT expiry check
chore: bump version to 0.2.0
docs: update API documentation
refactor: extract validation logic
test: add unit tests for redactor
perf: reduce spaCy model load time
```

Format: `<type>: <short description>`
This format is used by GitHub to auto-generate release notes.

## Version numbering (SemVer)

```
v  MAJOR . MINOR . PATCH
   │        │       └── bug fix, no new feature
   │        └────────── new feature, backwards compatible
   └─────────────────── breaking change

Examples:
  v0.1.0 → first public version
  v0.1.1 → bug fix
  v0.2.0 → new feature
  v1.0.0 → stable, production-ready milestone
```

Pre-release tags:
```
v0.2.0-beta.1   → beta (shown as pre-release on GitHub)
v0.2.0-rc.1     → release candidate
```
