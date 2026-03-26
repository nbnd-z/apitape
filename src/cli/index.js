#!/usr/bin/env node

/**
 * @fileoverview CLI entry point for apitape — zero dependencies
 * @module cli/index
 */

import { createRequire } from 'node:module';
import { createCLI } from './arg-parser.js';
import { initCommand } from './commands/init.js';
import { captureCommand } from './commands/capture.js';
import { typesCommand } from './commands/types.js';
import { listCommand } from './commands/list.js';
import { diffCommand } from './commands/diff.js';
import { syncCommand } from './commands/sync.js';
import { importCommand } from './commands/import.js';
import { mockCommand, mockAllCommand } from './commands/mock.js';
import { deleteCommand } from './commands/delete.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

/**
 * Wrap a command handler so that a non-zero return value triggers process.exit.
 * @param {Function} fn - Async command handler returning an exit code
 * @returns {Function} Wrapped handler
 */
function withExitCode(fn) {
  return async (...args) => {
    const code = await fn(...args);
    if (code) process.exit(code);
  };
}

const cli = createCLI({
  name: 'apitape',
  description: 'Record real API responses as test fixtures. Auto-generate types, MSW handlers, and detect API drift.',
  version
});

cli.command({
  name: 'init',
  description: 'Initialize a new fixtures directory with config',
  positional: null,
  options: [
    { short: '-f', long: '--force', description: 'Overwrite existing config', type: 'boolean' },
    { short: null, long: '--no-gitignore', description: 'Do not update .gitignore', type: 'boolean' }
  ],
  action: withExitCode(initCommand)
});

cli.command({
  name: 'capture',
  description: 'Capture an API response as a fixture',
  positional: '<url>',
  options: [
    { short: '-n', long: '--name', description: 'Fixture name (auto-generated from URL if omitted)', type: 'string' },
    { short: '-e', long: '--env', description: 'Environment name for URL resolution', type: 'string' },
    { short: '-m', long: '--method', description: 'HTTP method (default: GET)', type: 'string' },
    { short: '-H', long: '--header', description: 'Request headers', type: 'string', multiple: true },
    { short: null, long: '--auth', description: 'Auth type: bearer, api-key', type: 'string' },
    { short: null, long: '--auth-token', description: 'Auth token or API key', type: 'string' },
    { short: null, long: '--jsdoc', description: 'Generate JSDoc types file (.types.js)', type: 'boolean' },
    { short: null, long: '--typescript', description: 'Generate TypeScript types file (.d.ts)', type: 'boolean' },
    { short: null, long: '--msw', description: 'Generate MSW handler file (.msw.js)', type: 'boolean' },
    { short: null, long: '--allow-error', description: 'Capture non-2xx responses (e.g. 404, 500)', type: 'boolean' },
    { short: '-d', long: '--data', description: 'Request body (JSON string or @file.json)', type: 'string' }
  ],
  action: withExitCode(captureCommand)
});

cli.command({
  name: 'types',
  description: 'Generate types from all fixtures',
  positional: null,
  options: [
    { short: '-f', long: '--format', description: 'Output format: jsdoc, typescript (default: jsdoc)', type: 'string' },
    { short: '-o', long: '--output', description: 'Output directory', type: 'string' }
  ],
  action: withExitCode(typesCommand)
});

cli.command({
  name: 'list',
  description: 'List all fixtures with metadata',
  positional: null,
  options: [
    { short: '-j', long: '--json', description: 'Output as JSON', type: 'boolean' }
  ],
  action: withExitCode(listCommand)
});

cli.command({
  name: 'diff',
  description: 'Compare fixtures against live API to detect drift',
  positional: null,
  options: [
    { short: '-e', long: '--env', description: 'Environment name for URL resolution', type: 'string' },
    { short: null, long: '--config', description: 'Config file path', type: 'string' },
    { short: null, long: '--fail-on-drift', description: 'Exit with error code if drift detected', type: 'boolean' },
    { short: '-n', long: '--name', description: 'Filter by fixture name', type: 'string' },
    { short: '-j', long: '--json', description: 'Output as JSON', type: 'boolean' }
  ],
  action: withExitCode(diffCommand)
});

cli.command({
  name: 'sync',
  description: 'Re-capture all fixtures from their original URLs',
  positional: null,
  options: [
    { short: '-e', long: '--env', description: 'Environment name for URL resolution', type: 'string' },
    { short: null, long: '--config', description: 'Config file path', type: 'string' },
    { short: '-n', long: '--name', description: 'Filter by fixture name', type: 'string' },
    { short: null, long: '--dry-run', description: 'Show what would be synced without making changes', type: 'boolean' },
    { short: null, long: '--force', description: 'Force re-capture even if unchanged', type: 'boolean' }
  ],
  action: withExitCode(syncCommand)
});

cli.command({
  name: 'import',
  description: 'Import fixtures from OpenAPI specification (JSON or YAML)',
  positional: '<spec>',
  options: [
    { short: '-e', long: '--env', description: 'Environment name for URL resolution', type: 'string' },
    { short: null, long: '--config', description: 'Config file path', type: 'string' },
    { short: null, long: '--jsdoc', description: 'Generate JSDoc types for imported fixtures', type: 'boolean' },
    { short: null, long: '--typescript', description: 'Generate TypeScript types for imported fixtures', type: 'boolean' },
    { short: null, long: '--msw', description: 'Generate MSW handlers for imported fixtures', type: 'boolean' },
    { short: null, long: '--mock', description: 'Generate mock data from schema', type: 'boolean' }
  ],
  action: withExitCode(importCommand)
});

cli.command({
  name: 'mock',
  description: 'Generate mock data variants from existing fixture',
  positional: '<name>',
  options: [
    { short: '-c', long: '--count', description: 'Number of variants to generate', type: 'string', defaultValue: '3' },
    { short: '-o', long: '--output', description: 'Output name prefix', type: 'string' },
    { short: null, long: '--all', description: 'Generate mocks for all fixtures', type: 'boolean' },
    { short: null, long: '--seed', description: 'Seed for deterministic output (reproducible mocks)', type: 'string' },
    { short: null, long: '--jsdoc', description: 'Generate JSDoc types for mock variants', type: 'boolean' },
    { short: null, long: '--typescript', description: 'Generate TypeScript types for mock variants', type: 'boolean' },
    { short: null, long: '--msw', description: 'Generate MSW handlers for mock variants', type: 'boolean' },
    { short: null, long: '--vary', description: 'Fields to vary (space-separated)', type: 'string', multiple: true }
  ],
  action: withExitCode((name, opts) => opts.all ? mockAllCommand(opts) : mockCommand(name, opts))
});

cli.command({
  name: 'delete',
  description: 'Delete a fixture and its associated files',
  positional: '<name>',
  options: [],
  action: withExitCode(deleteCommand)
});

cli.run();
