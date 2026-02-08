import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { loadRegistrySources } from '../src/registry/loader.js';
import { validateRegistrySources } from '../src/registry/validator.js';

describe('Registry Validation', () => {
  const testDir = path.join(process.cwd(), 'tests', 'fixtures', 'registry-test');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('passes a valid JSON registry file', async () => {
    const filePath = path.join(testDir, 'valid.json');
    const content = {
      version: '1.0.0',
      tools: [{ tool_id: 't1', capability: ['c1'] }],
      servers: [{ server_id: 's1', endpoint: 'http://h:1', transport: 'http', capability: ['c1'] }]
    };
    await writeFile(filePath, JSON.stringify(content));

    const sources = await loadRegistrySources(filePath);
    const result = validateRegistrySources(sources);
    expect(result.valid).toBe(true);
    expect(result.stats.tools).toBe(1);
    expect(result.stats.servers).toBe(1);
  });

  it('passes a valid YAML registry file', async () => {
    const filePath = path.join(testDir, 'valid.yaml');
    const content = `
version: 1.0.0
tools:
  - tool_id: t1
    capability: [c1]
servers:
  - server_id: s1
    endpoint: http://h:1
    transport: http
    capability: [c1]
`;
    await writeFile(filePath, content);

    const sources = await loadRegistrySources(filePath);
    const result = validateRegistrySources(sources);
    expect(result.valid).toBe(true);
  });

  it('fails on invalid schema (missing required field)', async () => {
    const filePath = path.join(testDir, 'invalid.json');
    const content = {
      version: '1.0.0',
      tools: [{ capability: ['c1'] }] // missing tool_id
    };
    await writeFile(filePath, JSON.stringify(content));

    const sources = await loadRegistrySources(filePath);
    const result = validateRegistrySources(sources);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('tool_id'))).toBe(true);
  });

  it('fails on duplicate tool_id across files', async () => {
    await writeFile(path.join(testDir, 'f1.json'), JSON.stringify({
      version: '1.0.0',
      tools: [{ tool_id: 'dup', capability: ['c1'] }]
    }));
    await writeFile(path.join(testDir, 'f2.json'), JSON.stringify({
      version: '1.0.0',
      tools: [{ tool_id: 'dup', capability: ['c2'] }]
    }));

    const sources = await loadRegistrySources(testDir);
    const result = validateRegistrySources(sources);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Duplicate tool ID'))).toBe(true);
  });

  it('fails on duplicate tool_id in same file', async () => {
    const filePath = path.join(testDir, 'dup_internal.json');
    const content = {
      version: '1.0.0',
      tools: [
        { tool_id: 'dup', capability: ['c1'] },
        { tool_id: 'dup', capability: ['c2'] }
      ]
    };
    await writeFile(filePath, JSON.stringify(content));

    const sources = await loadRegistrySources(filePath);
    const result = validateRegistrySources(sources);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Duplicate tool_id: dup'))).toBe(true);
  });

  it('fails on missing referenced server_id', async () => {
    const filePath = path.join(testDir, 'missing_ref.json');
    const content = {
      version: '1.0.0',
      tools: [{ tool_id: 't1', capability: ['c1'], server_id: 'non-existent' }],
      servers: []
    };
    await writeFile(filePath, JSON.stringify(content));

    const sources = await loadRegistrySources(filePath);
    const result = validateRegistrySources(sources);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Referenced server_id not found'))).toBe(true);
  });
});
