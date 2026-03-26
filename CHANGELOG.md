# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-03-26

### Added
- `export` command — bundle all MSW handlers into a single `handlers.js` file
- Fixture tagging — `capture --tag auth --tag v2`, filter with `list/diff/sync/export --tag`
- Auto-name from URL — `capture` no longer requires `--name`, derives name from URL path
- `--data` / `-d` option for `capture` — send request body as JSON string or `@file.json`
- `mock --all` flag — routes to mockAllCommand; `mock:all` kept as backward-compatible alias
- `--name` filter for `diff` and `sync` — target a single fixture
- `sync --backup` — backup existing fixtures before overwriting
- `delete --force` — skip confirmation prompt (was in code but not exposed in CLI)
- `pAll` concurrency utility exported from public API
- Config validation on load — validates `fixturesDir`, `maxSizeBytes`, `arraySampleSize`, `typesFormat`, `auth`

### Changed
- `capture` shows "Updated" vs "Saved" when overwriting an existing fixture
- `singularize()` improved — handles addresses, categories, wolves, children, status, etc.
- `config.arraySampleSize` now wired into differ (was hardcoded to 5)
- Diff results split `changed` into `typeChanged` and `valueChanged` for clearer reports
- `list` output now includes Tags column

### Fixed
- `@file.json` data parsing no longer silently falls back to raw string on invalid JSON
- `arg-parser` defaults now use camelCase key consistently (was checking kebab-case, causing defaults to overwrite user values)
- `--count` coerced to `Number()` in mock commands (was string, `count === 1` never matched)

### Removed
- Dead code: `formatBytes`, `isValidFixtureName`, `slugify` from `cli/utils.js` (unused)
- Redundant `toPascalCase`/`sanitizeName` re-exports from `cli/utils.js`
- Duplicated `pAll` from `diff.js` and `sync.js` (moved to `core/utils.js`)

### Docs
- README fully rewritten with new tagline, all new commands/options, tagging section, updated programmatic API

## [0.2.3] - 2026-03-26

### Fixed
- `deleteFixture` now correctly returns `false` when fixture doesn't exist (was checking only first `Promise.allSettled` result without distinguishing ENOENT)
- `buildAuthHeader` now sanitizes custom api-key header names (`auth.header`), not just token values
- `sanitizeName` now throws on empty/invalid input instead of silently returning an empty string
- Removed unused variable `saved` and dead no-op block in YAML parser
- Prefixed unused `parentIndent` parameter in YAML parser with `_` to satisfy linter

## [0.2.2] - 2026-03-25

### Fixed
- Added LICENSE file (MIT)
- Fixed `repository.url` format in `package.json` to satisfy npm publish validation

## [0.2.1] - 2026-03-25

### Changed
- Renamed npm package from `apitape` to `api-tape` (CLI command remains `apitape`)
- Replaced `js-yaml` dependency with built-in zero-dependency YAML parser
- Removed dead code: unused formatter wrappers (`formatters/jsdoc.js`, `formatters/typescript.js`) and unused `get()`/`post()` helpers from `http-client.js`
- Switched README badges from npm-based to GitHub-based (license, node version)

## [0.2.0] - 2026-03-25

### Added
- YAML OpenAPI spec support — `import` now accepts `.yaml` and `.yml` files via built-in zero-dependency YAML parser
- Seedable PRNG (`createRng`) using mulberry32 algorithm for deterministic mock generation
- `mock --seed <number>` CLI flag for reproducible mock output
- `createRng` exported from public API
- 12 new tests covering YAML import, seeded PRNG, and deterministic mock generation
- 26 tests for the built-in YAML parser (185 total)

### Changed
- Extracted shared `generateArtifacts` and `regenerateExistingArtifacts` into `src/core/artifacts.js`, eliminating duplication across capture, sync, import, and mock commands
- Unified URL resolution — `sync` and `diff` now use `resolveEnv` from config instead of inline `new URL()` logic
- Converted all core modules (`config.js`, `fixture-store.js`, `artifacts.js`) to `fs/promises` with parallel I/O via `Promise.all`
- All CLI commands now return exit codes instead of calling `process.exit()` directly
- Centralised exit-code handling via `withExitCode` wrapper in CLI entry point
- Removed duplicate `sanitizeName` from `fixture-store.js` — now imports from `cli/utils.js`
- Renamed `inferType` in `mock-generator.js` to `inferSchemaType` to avoid collision with `generator.js`

### Fixed
- `diffObjects` now throws descriptive errors on invalid JSON string input instead of silent failures
- Auth header injection prevention — `sanitizeHeaderValue` strips `\r`, `\n`, `\0` from tokens

### Removed
- Dead code: `src/formatters/jsdoc.js` and `src/formatters/typescript.js` (unused wrapper files)
- Unused `get()` and `post()` helper functions from `http-client.js`
- `js-yaml` dependency — replaced with built-in zero-dependency YAML parser

### Docs
- README: added badges, architecture diagram, `mock:all` docs, `--seed` option, `--config` flag, contributing section
- Updated limitations section to reflect YAML support and `--seed` option

## [0.1.0] - 2026-03-21

### Added
- `capture` command — capture live API responses as JSON fixtures
- `capture --allow-error` — capture non-2xx responses (404, 500, etc.)
- `capture --env` — resolve URLs using environment config
- Config-level `auth` support (Bearer, API Key) — no need to pass tokens every time
- `types` command — generate JSDoc or TypeScript types from fixtures
- Deep recursive type generation — nested objects become named interfaces
- `list` command with `--json` output
- `diff` command — detect API drift (added/removed/changed fields)
- `diff --fail-on-drift` — CI-friendly exit code on drift
- `diff --json` — machine-readable JSON output
- `sync` command — re-capture all fixtures from original URLs
- `sync --dry-run` — preview what would change
- `import` command — generate fixtures from OpenAPI specs (JSON)
- `mock` command — generate mock data variants from existing fixtures
- `mock --vary` — control which fields get randomized
- `delete` command — remove fixtures and all associated generated files
- MSW handler generation (`--msw` flag on capture/import/mock)
- Programmatic API — all core functions exported for library usage
- OpenAPI `$ref` resolution with cycle detection
