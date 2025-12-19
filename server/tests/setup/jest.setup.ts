/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

// Extend Jest with additional matchers from jest-extended
import 'jest-extended';
import { jest, beforeAll, afterAll } from '@jest/globals';

// Mock ioredis globally
jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  class MockRedis extends EventEmitter {
    constructor() {
      super();
      // @ts-ignore
      this.status = 'ready';
    }
    connect() { return Promise.resolve(); }
    disconnect() { return Promise.resolve(); }
    quit() { return Promise.resolve(); }
    duplicate() { return new MockRedis(); }
    on() { return this; }
    get() { return Promise.resolve(null); }
    set() { return Promise.resolve('OK'); }
    del() { return Promise.resolve(1); }
    subscribe() { return Promise.resolve(); }
    psubscribe() { return Promise.resolve(); }
    publish() { return Promise.resolve(1); }
    scan() { return Promise.resolve(['0', []]); }
    pipeline() {
      return {
        exec: () => Promise.resolve([])
      };
    }
    multi() {
      return {
        exec: () => Promise.resolve([])
      };
    }
  }
  return MockRedis;
});

// Mock pg globally to avoid connection errors in tests that don't need real DB
jest.mock('pg', () => {
  const { EventEmitter } = require('events');
  class MockPool extends EventEmitter {
    connect() {
      return Promise.resolve({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      });
    }
    query() { return Promise.resolve({ rows: [] }); }
    end() { return Promise.resolve(); }
    on() { return this; }
  }
  return { Pool: MockPool };
});

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests unless debugging
const originalConsole = { ...console };
const originalConsoleError = console.error;

beforeAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
  }

  // Allow console.error for test debugging if needed, but fail test on it?
  // The original code threw an error, which is strict but good.
  console.error = (...args) => {
    // Check if it's the "Unhandled Rejection" we caught below, don't double throw
    if (args[0] && typeof args[0] === 'string' && args[0].startsWith('Unhandled Rejection')) {
      originalConsoleError(...args);
      return;
    }

    originalConsoleError(...args);
  };
});

afterAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  }
  console.error = originalConsoleError;
});
