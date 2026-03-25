/**
 * @fileoverview Import command - generate fixtures from OpenAPI spec
 * @module cli/commands/import
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parseYaml } from '../../core/yaml-parser.js';
import { loadConfig } from '../../core/config.js';
import { saveFixture, getFixturesDir } from '../../core/fixture-store.js';
import { generateMockData } from '../../core/mock-generator.js';
import { generateArtifacts } from '../../core/artifacts.js';
import { sanitizeName } from '../../core/utils.js';

/**
 * Import fixtures from OpenAPI specification
 * @param {string} specPath - Path to OpenAPI spec file (JSON or YAML)
 * @param {Object} options - Command options
 * @returns {Promise<number>} Exit code
 */
export async function importCommand(specPath, options = {}) {
  console.log(`Importing fixtures from OpenAPI spec: ${specPath}\n`);

  try {
    const spec = await loadOpenAPISpec(specPath);

    if (!spec) {
      console.error('Failed to parse OpenAPI specification. Supported formats: JSON, YAML.');
      return 1;
    }

    console.log(`API: ${spec.info?.title || 'Unknown'} v${spec.info?.version || '0.0.0'}`);
    console.log(`Endpoints found: ${countEndpoints(spec.paths || {})}\n`);

    await loadConfig(options.config);
    const fixturesDir = await getFixturesDir();

    let imported = 0;
    let skipped = 0;

    for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const operation = pathItem[method];
        if (!operation) continue;

        const operationId = operation.operationId || generateOperationId(method, pathStr);
        const fixtureName = sanitizeName(operationId);

        console.log(`Processing ${method.toUpperCase()} ${pathStr} -> ${fixtureName}`);

        const fixturePath = path.join(fixturesDir, `${fixtureName}.json`);
        if (existsSync(fixturePath)) {
          console.log(`  Skipping (already exists)\n`);
          skipped++;
          continue;
        }

        try {
          const schema = getResponseSchema(operation, spec);

          let data;
          if (options.mock && schema) {
            data = generateMockData(schema, spec);
          } else if (schema) {
            data = schema.example || generateMockData(schema, spec);
          } else {
            data = {};
          }

          await saveFixture(fixtureName, data, {
            url: pathStr,
            method: method.toUpperCase(),
            capturedAt: new Date().toISOString(),
            source: 'openapi-import',
            operationId
          });

          await generateArtifacts(
            fixtureName,
            data,
            { jsdoc: options.jsdoc, typescript: options.typescript, msw: options.msw },
            { url: pathStr, method: method.toUpperCase() },
            fixturesDir
          );

          console.log(`  ✓ Imported\n`);
          imported++;
        } catch (error) {
          console.log(`  ✗ Error: ${error.message}\n`);
        }
      }
    }

    console.log('Import Summary:');
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total endpoints: ${countEndpoints(spec.paths || {})}`);

    return 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}

/**
 * Load and parse OpenAPI specification (JSON or YAML) - async
 * @param {string} specPath - Path to spec file
 * @returns {Promise<Object|null>} Parsed spec or null
 */
async function loadOpenAPISpec(specPath) {
  const content = await fs.readFile(specPath, 'utf-8');
  const ext = path.extname(specPath).toLowerCase();

  try {
    if (ext === '.yaml' || ext === '.yml') {
      return parseYaml(content);
    }
    return JSON.parse(content);
  } catch {
    try {
      return ext === '.json' ? parseYaml(content) : JSON.parse(content);
    } catch {
      return null;
    }
  }
}

function getResponseSchema(operation, spec) {
  const responses = operation.responses;
  if (!responses) return null;

  const successResponse = responses['200'] || responses['201'] || responses.default;
  if (!successResponse) return null;

  const content = successResponse.content;
  if (!content) return null;

  const jsonContent = content['application/json'];
  if (!jsonContent) return null;

  let schema = jsonContent.schema;
  if (!schema) return null;

  if (schema.$ref) {
    schema = resolveRef(schema.$ref, spec);
  }

  return schema;
}

function resolveRef(ref, spec) {
  if (!ref.startsWith('#/')) return {};
  const parts = ref.slice(2).split('/');
  let current = spec;
  for (const part of parts) {
    current = current[part];
    if (!current) return {};
  }
  return current;
}

function countEndpoints(paths) {
  let count = 0;
  for (const pathItem of Object.values(paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      if (pathItem[method]) count++;
    }
  }
  return count;
}

function generateOperationId(method, pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  return `${method}-${parts.join('-')}`;
}
