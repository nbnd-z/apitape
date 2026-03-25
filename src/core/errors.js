/**
 * @fileoverview Custom error classes
 * @module core/errors
 */

export class ApitapeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApitapeError';
  }
}

export class FixtureNotFoundError extends ApitapeError {
  constructor(name) {
    super(`Fixture not found: ${name}`);
    this.name = 'FixtureNotFoundError';
    this.fixtureName = name;
  }
}

export class ConfigError extends ApitapeError {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class FixtureSizeError extends ApitapeError {
  constructor(name, size, maxSize) {
    super(`Fixture "${name}" exceeds maxSizeBytes (${size} > ${maxSize})`);
    this.name = 'FixtureSizeError';
    this.fixtureName = name;
    this.size = size;
    this.maxSize = maxSize;
  }
}

export class HttpRequestError extends ApitapeError {
  constructor(message, { url, status } = {}) {
    super(message);
    this.name = 'HttpRequestError';
    this.url = url;
    this.status = status;
  }
}
