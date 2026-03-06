# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [0.1.0] - 2026-03-06

### Added

- Introduced structured run lifecycle (`queued`, `running`, `success`, `error`, `stopped`) with `runId`.
- Added stop control for long-running executions.
- Added environment-level `Organization API URL` support.
- Switched organization creation scenario to direct API execution.
- Added chain execution by `runId` completion instead of fixed timeout.
- Added basic versioning policy and release templates.
