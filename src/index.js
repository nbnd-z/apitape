/**
 * @fileoverview Main entry point for apitape
 * @module apitape
 */

// Config
export { loadConfig, resolveEnv, saveConfig, clearConfigCache } from './core/config.js';

// HTTP
export { fetchWithAuth } from './core/http-client.js';

// Fixtures
export { saveFixture, loadFixture, loadMetadata, listFixtures, deleteFixture, fixtureExists } from './core/fixture-store.js';

// Type generation
export { inferType, generateJSDoc, generateTypeScript, generateType, setArraySampleSize } from './core/generator.js';

// Diff
export { diffObjects, formatDiffResult, hashValue, setDiffArraySampleSize } from './core/differ.js';

// Mock generation
export { generateMockData, generateVariants, createRng } from './core/mock-generator.js';

// MSW
export { generateMSW, generateMSWHandlers } from './formatters/msw.js';

// Artifacts
export { generateArtifacts, regenerateExistingArtifacts } from './core/artifacts.js';

// Errors
export { ApitapeError, FixtureNotFoundError, ConfigError, FixtureSizeError, HttpRequestError } from './core/errors.js';

// Core utils
export { sanitizeName, toPascalCase } from './core/utils.js';
