/**
 * @fileoverview Main entry point for apitape
 * @module apitape
 */

// Config
export { loadConfig, resolveEnv } from './core/config.js';

// HTTP
export { fetchWithAuth } from './core/http-client.js';

// Fixtures
export { saveFixture, loadFixture, loadMetadata, listFixtures, deleteFixture, fixtureExists } from './core/fixture-store.js';

// Type generation
export { inferType, generateJSDoc, generateTypeScript, generateType } from './core/generator.js';

// Diff
export { diffObjects, formatDiffResult } from './core/differ.js';

// Mock generation
export { generateMockData, generateVariants, createRng } from './core/mock-generator.js';

// MSW
export { generateMSW, generateMSWHandlers } from './formatters/msw.js';

// Artifacts
export { generateArtifacts, regenerateExistingArtifacts } from './core/artifacts.js';
