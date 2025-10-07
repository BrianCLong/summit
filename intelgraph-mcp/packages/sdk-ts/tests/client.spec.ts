import { describe, it, expect } from 'vitest';
import { McpClient } from '../src/client';
import { sse } from '../src/sse';

describe('McpClient', () => {
  it('constructs', () => {
    const c = new McpClient('http://localhost:8080', 'token');
    expect(c).toBeTruthy();
  });

  it('exposes sse helper', () => {
    expect(typeof sse).toBe('function');
  });

  it('provides stream generator', () => {
    const c = new McpClient('http://localhost:8080', 'token');
    const iterator = c.stream({ id: 'sess-test' });
    expect(typeof iterator[Symbol.asyncIterator]).toBe('function');
  });

  it('provides capability discovery methods', () => {
    const c = new McpClient('http://localhost:8080', 'token');
    expect(typeof c.listTools).toBe('function');
    expect(typeof c.listResources).toBe('function');
    expect(typeof c.listPrompts).toBe('function');
  });
});
