# Versioning Policy

This repository follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.

## Rules

- `MAJOR`: breaking changes (API contract or behavior is not backward compatible).
- `MINOR`: backward-compatible feature additions.
- `PATCH`: backward-compatible bug fixes and small improvements.

## Commit Convention

Use Conventional Commits:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructure without behavior change
- `docs:` documentation only
- `test:` tests only
- `chore:` maintenance/build/tooling

If a commit is breaking, add `BREAKING CHANGE:` in the commit body.

## Branch Strategy

- `main`: stable releases only
- `develop`: integration branch
- `feature/*`: feature work
- `fix/*`: non-critical fixes
- `hotfix/*`: urgent production fixes

## Release Flow

1. Merge completed work into `develop`.
2. Create release PR from `develop` to `main`.
3. Update `CHANGELOG.md`.
4. Bump version (`patch|minor|major`) via release script.
5. Merge to `main` and create Git tag `vX.Y.Z`.

## Current Baseline

- Initial managed baseline: `v0.1.0`
