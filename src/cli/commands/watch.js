/**
 * @fileoverview Watch command — auto-re-capture fixtures when metadata changes
 * @module cli/commands/watch
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../../core/config.js';
import { listFixtures } from '../../core/fixture-store.js';
import { captureCommand } from './capture.js';

/**
 * Watch fixtures directory and re-capture on changes.
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code (never returns in normal operation)
 */
export async function watchCommand(options = {}) {
  const config = await loadConfig();
  const fixturesDir = config.fixturesDir || './fixtures';

  if (!fs.existsSync(fixturesDir)) {
    console.error('✗ No fixtures directory. Run `apitape init` first.');
    return 1;
  }

  const interval = Number(options.interval) || 3000;
  console.log(`👀 Watching ${fixturesDir} (every ${interval / 1000}s)...`);
  console.log('   Press Ctrl+C to stop.\n');

  // Initial list
  let known = await getFixtureMap(fixturesDir);
  console.log(`   Tracking ${Object.keys(known).length} fixture(s)\n`);

  // Poll for metadata changes (portable across Node/Bun/Deno — fs.watch is unreliable)
  const timer = setInterval(async () => {
    try {
      const current = await getFixtureMap(fixturesDir);
      for (const [name, meta] of Object.entries(current)) {
        const prev = known[name];
        if (!prev) {
          console.log(`+ New fixture detected: ${name}`);
          known[name] = meta;
          continue;
        }
        if (prev.mtime !== meta.mtime && meta.url) {
          console.log(`↻ Re-capturing: ${name} → ${meta.url}`);
          await captureCommand(meta.url, {
            name,
            method: meta.method,
            typescript: options.typescript,
            msw: options.msw,
            allowError: true,
          });
        }
      }
      known = current;
    } catch { /* ignore transient errors */ }
  }, interval);

  // Keep alive
  await new Promise((resolve) => {
    process.on('SIGINT', () => { clearInterval(timer); console.log('\n👋 Stopped.'); resolve(); });
  });
  return 0;
}

async function getFixtureMap(dir) {
  const map = {};
  const fixtures = await listFixtures();
  for (const f of fixtures) {
    const metaPath = path.join(dir, f.name, 'metadata.json');
    try {
      const stat = fs.statSync(metaPath);
      map[f.name] = { mtime: stat.mtimeMs, url: f.url, method: f.method || 'GET' };
    } catch { /* skip */ }
  }
  return map;
}
