/**
 * @fileoverview Watch command — auto-re-capture fixtures when metadata changes
 * @module cli/commands/watch
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../../core/config.js';
import { getFixturesDir } from '../../core/fixture-store.js';
import { captureCommand } from './capture.js';

/**
 * Watch fixtures directory and re-capture on metadata file changes.
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code (never returns in normal operation)
 */
export async function watchCommand(options = {}) {
  const config = await loadConfig();
  const fixturesDir = await getFixturesDir();

  if (!fs.existsSync(fixturesDir)) {
    console.error('✗ No fixtures directory. Run `apitape init` first.');
    return 1;
  }

  const interval = Number(options.interval) || 3000;
  console.log(`👀 Watching ${fixturesDir} (every ${interval / 1000}s)...`);
  console.log('   Press Ctrl+C to stop.\n');

  let known = getMetaSnapshot(fixturesDir);
  console.log(`   Tracking ${Object.keys(known).length} fixture(s)\n`);

  const timer = setInterval(async () => {
    try {
      const current = getMetaSnapshot(fixturesDir);

      for (const [name, meta] of Object.entries(current)) {
        const prev = known[name];
        if (!prev) {
          console.log(`+ New fixture: ${name}`);
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

  await new Promise((resolve) => {
    process.on('SIGINT', () => { clearInterval(timer); console.log('\n👋 Stopped.'); resolve(); });
  });
  return 0;
}

/**
 * Scan fixtures dir for .meta.json files, return name → { mtime, url, method }
 */
function getMetaSnapshot(fixturesDir) {
  const map = {};
  let files;
  try { files = fs.readdirSync(fixturesDir); } catch { return map; }

  for (const file of files) {
    if (!file.endsWith('.meta.json')) continue;
    const name = file.replace('.meta.json', '');
    const metaPath = path.join(fixturesDir, file);
    try {
      const stat = fs.statSync(metaPath);
      const content = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      map[name] = { mtime: stat.mtimeMs, url: content.url || null, method: content.method || 'GET' };
    } catch { /* skip corrupt */ }
  }
  return map;
}
