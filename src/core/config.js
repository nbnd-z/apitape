/**
 * @fileoverview Configuration management
 * @module core/config
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ConfigError } from './errors.js';

/**
 * @typedef {Object} Config
 * @property {string} fixturesDir - Directory for fixtures
 * @property {string} typesOutput - Output directory for types
 * @property {string} typesFormat - Format for types (jsdoc, typescript)
 * @property {Object} environments - Environment configurations
 * @property {Object|null} auth - Authentication configuration
 * @property {Object} defaultHeaders - Default request headers
 * @property {number} maxSizeBytes - Maximum fixture size
 * @property {number} arraySampleSize - Array sample size for type inference
 */

const CONFIG_FILE = 'apitape.config.json';

/** @type {{ config: Config|null, path: string|null }} */
const cache = { config: null, path: null };

/**
 * Clear the config cache
 */
export function clearConfigCache() {
  cache.config = null;
  cache.path = null;
}

/**
 * Load configuration from file
 * @param {string} [filePath] - Path to config file
 * @returns {Promise<Config>} Configuration object
 */
export async function loadConfig(filePath) {
  const configPath = filePath || path.join(process.cwd(), CONFIG_FILE);

  if (cache.config && cache.path === configPath) {
    return cache.config;
  }

  if (!existsSync(configPath)) {
    const config = getDefaultConfig();
    cache.config = config;
    cache.path = configPath;
    return config;
  }

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    const config = { ...getDefaultConfig(), ...parsed };
    validateConfig(config);
    cache.config = config;
    cache.path = configPath;
    return config;
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(`Failed to parse config file: ${error.message}`);
  }
}

/**
 * Get default configuration
 * @returns {Config} Default configuration
 */
function getDefaultConfig() {
  return {
    fixturesDir: './fixtures',
    typesOutput: './fixtures',
    typesFormat: 'jsdoc',
    environments: {},
    auth: null,
    defaultHeaders: {
      'Content-Type': 'application/json'
    },
    maxSizeBytes: 5242880,
    arraySampleSize: 100
  };
}

/**
 * Resolve environment variable in URL.
 * @param {string} url - URL (absolute or relative)
 * @param {string} envName - Environment name
 * @param {Config} config - Configuration object
 * @returns {string} Resolved URL
 */
export function resolveEnv(url, envName, config) {
  if (!envName || !config.environments || !config.environments[envName]) {
    return url;
  }

  const env = config.environments[envName];
  const baseUrl = env.baseUrl || '';

  if (url.startsWith('/') && baseUrl) {
    return baseUrl.replace(/\/+$/, '') + url;
  }

  let resolved = url;
  for (const [key, value] of Object.entries(env)) {
    resolved = resolved.replace(`{${key}}`, value);
  }

  return resolved;
}

/**
 * Save configuration to file
 * @param {Config} config - Configuration object
 * @param {string} [filePath] - Path to config file
 * @returns {Promise<void>}
 */
export async function saveConfig(config, filePath) {
  const configPath = filePath || path.join(process.cwd(), CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  // Invalidate cache
  clearConfigCache();
}

/**
 * Validate configuration values
 * @param {Config} config - Configuration to validate
 * @throws {ConfigError} If config is invalid
 */
function validateConfig(config) {
  if (typeof config.fixturesDir !== 'string' || !config.fixturesDir) {
    throw new ConfigError('fixturesDir must be a non-empty string');
  }
  if (typeof config.maxSizeBytes !== 'number' || config.maxSizeBytes <= 0) {
    throw new ConfigError('maxSizeBytes must be a positive number');
  }
  if (typeof config.arraySampleSize !== 'number' || config.arraySampleSize <= 0) {
    throw new ConfigError('arraySampleSize must be a positive number');
  }
  const validFormats = ['jsdoc', 'typescript'];
  if (!validFormats.includes(config.typesFormat)) {
    throw new ConfigError(`typesFormat must be one of: ${validFormats.join(', ')}`);
  }
  if (config.auth !== null && typeof config.auth !== 'object') {
    throw new ConfigError('auth must be an object or null');
  }
}
