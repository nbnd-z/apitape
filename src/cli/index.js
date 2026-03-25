#!/usr/bin/env node

/**
 * @fileoverview CLI entry point for apitape
 * @module cli/index
 */

import { createRequire } from 'node:module';
import { program } from 'commander';
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

program
  .name('apitape')
  .description('Record real API responses as test fixtures. Auto-generate types, MSW handlers, and detect API drift.')
  .version(version);

program
  .command('init')
  .description('Initialize a new fixtures directory with config')
  .option('-f, --force', 'Overwrite existing config')
  .option('--no-gitignore', 'Do not update .gitignore')
  .action(withExitCode(initCommand));

program
  .command('capture <url>')
  .description('Capture an API response as a fixture')
  .requiredOption('-n, --name <name>', 'Fixture name')
  .option('-e, --env <environment>', 'Environment name for URL resolution')
  .option('-m, --method <method>', 'HTTP method (default: GET)')
  .option('-H, --header <headers...>', 'Request headers')
  .option('-d, --data <body>', 'Request body (JSON string) for POST/PUT')
  .option('--auth <type>', 'Auth type: bearer, api-key')
  .option('--auth-token <token>', 'Auth token or API key')
  .option('--jsdoc', 'Generate JSDoc types file (.types.js)')
  .option('--typescript', 'Generate TypeScript types file (.d.ts)')
  .option('--msw', 'Generate MSW handler file (.msw.js)')
  .option('--allow-error', 'Capture non-2xx responses (e.g. 404, 500)')
  .action(withExitCode(captureCommand));

program
  .command('types')
  .description('Generate types from all fixtures')
  .option('-f, --format <format>', 'Output format: jsdoc, typescript (default: jsdoc)')
  .option('-o, --output <dir>', 'Output directory')
  .action(withExitCode(typesCommand));

program
  .command('list')
  .description('List all fixtures with metadata')
  .option('-j, --json', 'Output as JSON')
  .action(withExitCode(listCommand));

program
  .command('diff')
  .description('Compare fixtures against live API to detect drift')
  .option('-e, --env <environment>', 'Environment name for URL resolution')
  .option('--config <path>', 'Config file path')
  .option('--fail-on-drift', 'Exit with error code if drift detected')
  .option('-j, --json', 'Output as JSON')
  .option('-n, --name <name>', 'Filter to a specific fixture')
  .option('--concurrency <number>', 'Max concurrent requests', '4')
  .action(withExitCode(diffCommand));

program
  .command('sync')
  .description('Re-capture all fixtures from their original URLs')
  .option('-e, --env <environment>', 'Environment name for URL resolution')
  .option('--config <path>', 'Config file path')
  .option('--dry-run', 'Show what would be synced without making changes')
  .option('--force', 'Force re-capture even if unchanged')
  .option('-n, --name <name>', 'Filter to a specific fixture')
  .option('--concurrency <number>', 'Max concurrent requests', '4')
  .option('--backup', 'Backup existing fixtures before overwriting')
  .action(withExitCode(syncCommand));

program
  .command('import <spec>')
  .description('Import fixtures from OpenAPI specification (JSON or YAML)')
  .option('-e, --env <environment>', 'Environment name for URL resolution')
  .option('--config <path>', 'Config file path')
  .option('--jsdoc', 'Generate JSDoc types for imported fixtures')
  .option('--typescript', 'Generate TypeScript types for imported fixtures')
  .option('--msw', 'Generate MSW handlers for imported fixtures')
  .option('--mock', 'Generate mock data from schema')
  .action(withExitCode(importCommand));

program
  .command('mock <name>')
  .description('Generate mock data variants from existing fixture')
  .option('-c, --count <number>', 'Number of variants to generate', '3')
  .option('-o, --output <prefix>', 'Output name prefix')
  .option('--all', 'Generate mocks for all fixtures')
  .option('--seed <number>', 'Seed for deterministic output (reproducible mocks)')
  .option('--jsdoc', 'Generate JSDoc types for mock variants')
  .option('--typescript', 'Generate TypeScript types for mock variants')
  .option('--msw', 'Generate MSW handlers for mock variants')
  .option('--vary <fields...>', 'Fields to vary (comma-separated)')
  .action(withExitCode(mockCommand));

program
  .command('delete <name>')
  .description('Delete a fixture and its associated files')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(withExitCode(deleteCommand));

program
  .command('mock:all')
  .description('Generate mock variants for all fixtures')
  .option('-c, --count <number>', 'Number of variants per fixture', '3')
  .option('--jsdoc', 'Generate JSDoc types')
  .option('--typescript', 'Generate TypeScript types')
  .option('--msw', 'Generate MSW handlers')
  .action(withExitCode(mockAllCommand));

program.parse();
