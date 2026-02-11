import { describe, it, expect } from 'vitest';
import { parseServerConfig } from './manifest.js';
import fixture from './__fixtures__/minimal.local.json';

describe('mcp_manifest_parse', () => {
  it('parses a valid minimal fixture', () => {
    const config = parseServerConfig(fixture);
    expect(config.id).toBe('local-fixture-server');
    expect(config.tools).toHaveLength(1);
    expect(config.tools?.[0].name).toBe('echo');
  });

  it('throws on missing id', () => {
    expect(() => parseServerConfig({})).toThrow(/missing required field: id/);
  });
});
