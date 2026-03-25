# apitape

[![npm version](https://img.shields.io/npm/v/apitape)](https://www.npmjs.com/package/apitape)
[![license](https://img.shields.io/npm/l/apitape)](https://github.com/nbnd-z/apitape/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/apitape)](https://nodejs.org)

Record real API responses as test fixtures with auto-generated types and MSW handlers — then detect drift before your tests break.

## How It Works

```
capture → fixtures (.json + .meta.json)
            ├── types    (.d.ts / .types.js)
            ├── msw      (.msw.js)
            └── mock     (variant fixtures)

diff   → compare fixtures against live API → detect drift
sync   → re-capture all fixtures from original URLs
import → generate fixtures from OpenAPI spec
```

1. **Capture** a live API response as a JSON fixture with metadata
2. **Generate** TypeScript interfaces, JSDoc typedefs, or MSW handlers from the fixture
3. **Detect drift** by diffing fixtures against the live API — catch breaking changes in CI
4. **Re-sync** all fixtures when the API intentionally changes
5. **Import** fixtures from an OpenAPI spec, optionally with mock data
6. **Mock** — generate randomised variants of existing fixtures for broader test coverage

## Features

- 🎯 Capture real API responses as JSON fixtures (including error responses)
- 📝 Auto-generate deep, recursive type definitions (JSDoc or TypeScript)
- 🔍 Detect API drift with `diff` — catch breaking changes before your tests do
- 🔄 Re-sync all fixtures from live APIs with one command
- 🧪 Generate MSW handlers automatically for browser/node mocking
- 📦 Import fixtures from OpenAPI specs (JSON & YAML)
- 🎲 Generate mock data variants from existing fixtures
- 🔐 Support for Bearer and API Key authentication (CLI flags or config)
- 📁 Simple fixture storage with metadata
- 🪶 Zero runtime dependencies (besides commander)

## Installation

```bash
npm install apitape
```

## Quick Start

### 1. Initialize

```bash
npx apitape init
```

This creates:
- `fixtures/` directory
- `apitape.config.json` configuration file
- Updates `.gitignore` (optional)

### 2. Capture API Responses

```bash
npx apitape capture https://api.example.com/users --name users
```

### 3. Generate Types

```bash
npx apitape types --format typescript
# or
npx apitape types --format jsdoc
```

Nested objects are generated as named interfaces:

```typescript
export interface UsersAddress {
  street: string;
  city: string;
}

export interface Users {
  id: number;
  name: string;
  address: UsersAddress;
}
```

### 4. Detect API Drift

```bash
npx apitape diff
npx apitape diff --fail-on-drift  # CI-friendly: exits 1 on drift
npx apitape diff --json           # Machine-readable output
```

### 5. Re-sync Fixtures

```bash
npx apitape sync
npx apitape sync --dry-run  # Preview changes
```

### 6. List & Delete Fixtures

```bash
npx apitape list
npx apitape list --json
npx apitape delete users    # Removes fixture + types + MSW handler
```

## Configuration

Edit `apitape.config.json`:

```json
{
  "fixturesDir": "./fixtures",
  "typesOutput": "./fixtures",
  "typesFormat": "jsdoc",
  "environments": {
    "staging": {
      "baseUrl": "https://staging.api.example.com"
    },
    "production": {
      "baseUrl": "https://api.example.com"
    }
  },
  "auth": {
    "type": "bearer",
    "token": "your-default-token"
  },
  "defaultHeaders": {
    "Content-Type": "application/json"
  },
  "maxSizeBytes": 5242880,
  "arraySampleSize": 100
}
```

Auth in config is used automatically by `capture`. CLI flags (`--auth`, `--auth-token`) override config when provided.

## CLI Commands

### `init`

Initialize fixtures directory and config.

```bash
apitape init
apitape init --force        # Overwrite existing config
apitape init --no-gitignore # Skip .gitignore update
```

### `capture <url>`

Capture an API response as a fixture.

```bash
# Basic capture
apitape capture https://api.example.com/users --name users

# With environment resolution
apitape capture /users --env staging --name users

# With auth (overrides config)
apitape capture https://api.example.com/users \
  --name users \
  --auth bearer \
  --auth-token "your-token"

# With custom headers
apitape capture https://api.example.com/users \
  --name users \
  -H "Accept: text/plain" \
  -H "X-Custom: value"

# Capture error responses (404, 500, etc.)
apitape capture https://api.example.com/missing \
  --name not-found \
  --allow-error

# Generate types + MSW handler on capture
apitape capture https://api.example.com/users \
  --name users \
  --typescript --msw
```

Options:
- `-n, --name <name>` - Fixture name (required)
- `-e, --env <environment>` - Environment name for URL resolution
- `-m, --method <method>` - HTTP method (default: GET)
- `-H, --header <headers...>` - Request headers (format: `"Key: Value"`)
- `--auth <type>` - Auth type: bearer, api-key
- `--auth-token <token>` - Auth token or API key
- `--jsdoc` - Generate JSDoc types file
- `--typescript` - Generate TypeScript types file
- `--msw` - Generate MSW handler file
- `--allow-error` - Capture non-2xx responses

### `types`

Generate types from all fixtures.

```bash
apitape types
apitape types --format typescript
apitape types --output ./src/types
```

### `list`

List all fixtures with metadata.

```bash
apitape list
apitape list --json
```

### `delete <name>`

Delete a fixture and all associated generated files (.json, .meta.json, .d.ts, .types.js, .msw.js).

```bash
apitape delete users
```

### `diff`

Compare fixtures against live API to detect drift.

```bash
apitape diff
apitape diff --env staging
apitape diff --fail-on-drift  # Exit code 1 on drift (CI-friendly)
apitape diff --json           # Machine-readable JSON output
apitape diff --config ./custom-config.json
```

### `sync`

Re-capture all fixtures from their original URLs.

```bash
apitape sync
apitape sync --dry-run
apitape sync --force
apitape sync --env staging
apitape sync --config ./custom-config.json
```

### `import <spec>`

Import fixtures from an OpenAPI specification (JSON or YAML).

```bash
apitape import ./openapi.json
apitape import ./openapi.yaml
apitape import ./openapi.yml --mock --typescript --msw
```

### `mock <name>`

Generate mock data variants from existing fixture.

```bash
apitape mock users --count 5
apitape mock users --count 3 --vary name email
apitape mock users --count 3 --typescript --msw
apitape mock users --count 3 --seed 42  # Deterministic output
```

### `mock:all`

Generate mock variants for all fixtures at once.

```bash
apitape mock:all
apitape mock:all --count 5 --typescript --msw
```

## CI Integration

Use `diff --fail-on-drift` in your CI pipeline to catch API changes:

```yaml
# GitHub Actions example
- name: Check fixture drift
  run: npx apitape diff --fail-on-drift --json
```

## Programmatic Usage

All core functions are exported for library usage:

```javascript
import {
  // Config
  loadConfig, resolveEnv,
  // HTTP
  fetchWithAuth,
  // Fixtures
  saveFixture, loadFixture, loadMetadata,
  listFixtures, deleteFixture, fixtureExists,
  // Type generation
  generateJSDoc, generateTypeScript, generateType, inferType,
  // Diff
  diffObjects, formatDiffResult,
  // Mock generation
  generateMockData, generateVariants, createRng,
  // MSW
  generateMSW, generateMSWHandlers,
  // Artifact generation (types + MSW in one call)
  generateArtifacts, regenerateExistingArtifacts
} from 'apitape';
```

### Example

```javascript
// Capture and type-generate programmatically
const response = await fetchWithAuth('https://api.example.com/users', {
  auth: { type: 'bearer', token: 'your-token' }
});

await saveFixture('users', response.data, {
  url: 'https://api.example.com/users',
  method: 'GET'
});

// Generate TypeScript + MSW in one call
await generateArtifacts('users', response.data,
  { typescript: true, msw: true },
  { url: 'https://api.example.com/users', method: 'GET' }
);

// Detect drift
const fixture = await loadFixture('users');
const liveResponse = await fetchWithAuth('https://api.example.com/users');
const diff = diffObjects(fixture, liveResponse.data);

if (diff.status === 'breaking') {
  console.error(formatDiffResult(diff));
}

// Generate mock variants
const variants = generateVariants(response.data, { count: 5, variations: ['name', 'email'] });
```

## Limitations

- Array drift detection compares only the first 5 items for structural changes. Differences beyond index 4 are not reported.
- Mock data generation uses `Math.random()` by default and is non-deterministic. Pass `--seed <number>` for reproducible output in snapshot tests.
- OpenAPI import supports JSON and YAML specs.

## Requirements

- Node.js 18.0.0 or higher

## Contributing

```bash
git clone https://github.com/nbnd-z/apitape.git
cd apitape
npm install
npm test
```

## License

MIT
