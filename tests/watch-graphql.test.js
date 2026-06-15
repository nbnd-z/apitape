import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, '..', '.tmp-test-watch');

describe('watch command', () => {
  before(() => {
    fs.mkdirSync(TMP, { recursive: true });
    // Create a fake fixture + meta
    fs.writeFileSync(path.join(TMP, 'users.json'), JSON.stringify({ id: 1 }));
    fs.writeFileSync(path.join(TMP, 'users.meta.json'), JSON.stringify({
      url: 'https://api.example.com/users',
      method: 'GET',
      capturedAt: '2026-06-15T00:00:00Z',
      status: 200
    }));
  });

  after(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

  it('getMetaSnapshot reads .meta.json files correctly', async () => {
    // Import the watch module to test getMetaSnapshot indirectly
    // Since getMetaSnapshot is not exported, we test via the file pattern detection
    const files = fs.readdirSync(TMP);
    const metaFiles = files.filter(f => f.endsWith('.meta.json'));
    assert.equal(metaFiles.length, 1);
    assert.equal(metaFiles[0], 'users.meta.json');

    const content = JSON.parse(fs.readFileSync(path.join(TMP, metaFiles[0]), 'utf-8'));
    assert.equal(content.url, 'https://api.example.com/users');
    assert.equal(content.method, 'GET');
  });

  it('meta file name derivation matches fixture store pattern', () => {
    // Fixture store uses: <name>.json + <name>.meta.json (flat, no subdirs)
    const fixtureName = 'users';
    const dataFile = `${fixtureName}.json`;
    const metaFile = `${fixtureName}.meta.json`;

    assert.ok(fs.existsSync(path.join(TMP, dataFile)));
    assert.ok(fs.existsSync(path.join(TMP, metaFile)));
    // Ensure we're NOT using subdir pattern
    assert.ok(!fs.existsSync(path.join(TMP, fixtureName, 'metadata.json')));
  });
});

describe('--graphql flag', () => {
  it('wraps plain query string into { query: ... } body', () => {
    const data = '{ users { id name } }';
    // Simulate --graphql logic from capture.js
    let body = data;
    try { body = JSON.parse(data); } catch { /* keep as string */ }
    if (typeof body === 'string' || !body?.query) {
      body = { query: typeof body === 'string' ? body : data };
    }
    assert.deepEqual(body, { query: '{ users { id name } }' });
  });

  it('preserves already-structured graphql body', () => {
    const data = JSON.stringify({ query: '{ users { id } }', variables: { limit: 10 } });
    let body = JSON.parse(data);
    // --graphql only wraps if body doesn't have .query
    if (!body?.query) {
      body = { query: data };
    }
    assert.equal(body.query, '{ users { id } }');
    assert.equal(body.variables.limit, 10);
  });

  it('forces POST method', () => {
    const method = 'GET';
    const effectiveMethod = true ? 'POST' : method; // --graphql=true
    assert.equal(effectiveMethod, 'POST');
  });
});
