# Contributing

## Commit format

Use Conventional Commits:

- `feat(scope): add new capability`
- `fix(scope): resolve bug`
- `refactor(scope): improve structure`
- `docs(scope): update documentation`
- `test(scope): add or update tests`
- `chore(scope): maintenance`

Examples:

- `feat(run): add queued status transitions`
- `fix(chain): wait by runId instead of timeout`
- `docs(versioning): add release policy`

## Branch naming

- `feature/<short-topic>`
- `fix/<short-topic>`
- `hotfix/<short-topic>`

## Release commands

From repository root:

- `npm run release:patch`
- `npm run release:minor`
- `npm run release:major`

These commands update `backend/package.json` version and prepend a new section in `CHANGELOG.md`.
