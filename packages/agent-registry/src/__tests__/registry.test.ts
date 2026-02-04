import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { loadAgentRegistry, stableStringify } from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../');
const fixtureDir = path.join(repoRoot, 'docs/agents/registry');

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'agent-registry-'));
}

describe('agent registry loader', () => {
  it('loads agents in deterministic order', async () => {
    const { agents, errors } = await loadAgentRegistry(fixtureDir);

    expect(errors).toEqual([]);
    expect(agents.map((agent) => agent.id)).toEqual([
      'decision-critic',
      'maestro-orchestrator',
      'sop-compiler',
    ]);
    expect(agents.find((agent) => agent.id === 'maestro-orchestrator')?.data_access).toBe(
      'internal'
    );
  });

  it('reports invalid YAML', async () => {
    const dir = await createTempDir();
    await fs.writeFile(path.join(dir, 'bad.yaml'), 'id: [unclosed');

    const { errors } = await loadAgentRegistry(dir);

    expect(errors.length).toBe(1);
    expect(errors[0]?.message).toContain('YAML parse failed');
  });

  it('reports schema violations with field path', async () => {
    const dir = await createTempDir();
    await fs.writeFile(
      path.join(dir, 'invalid.yaml'),
      [
        'id: invalid agent',
        'version: 0.1.0',
        'description: Missing required fields',
        'role: specialist',
        'inputs: []',
        'outputs: []',
      ].join('\n')
    );

    const { errors } = await loadAgentRegistry(dir);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.path === 'id')).toBe(true);
  });

  it('detects duplicate agent ids', async () => {
    const dir = await createTempDir();
    const payload = [
      'id: duplicate-agent',
      'name: Duplicate Agent',
      'version: 0.1.0',
      'description: Duplicate',
      'role: executor',
      'inputs: []',
      'outputs: []',
    ].join('\n');

    await fs.writeFile(path.join(dir, 'one.yaml'), payload);
    await fs.writeFile(path.join(dir, 'two.yaml'), payload);

    const { errors } = await loadAgentRegistry(dir);

    expect(errors.some((error) => error.message.includes('Duplicate agent id'))).toBe(true);
  });

  it('serializes JSON with stable key ordering', () => {
    const output = stableStringify({ b: 1, a: { d: 2, c: 3 } });

    expect(output).toBe('{\n  \"a\": {\n    \"c\": 3,\n    \"d\": 2\n  },\n  \"b\": 1\n}');
  });
});
