import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConstitutionLoader } from '../constitution.js';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('node:fs');

describe('ConstitutionLoader', () => {
  const mockAgentsMd = `
# Header

## Role: Jules (Release Captain)
* Permissions: Full Repo Access, Merge Authority, Policy Definition.

## Role: Codex (Engineer)
* Permissions: Code Commit (witnessed), Test Execution.
`;

  it('should parse AGENTS.md sections', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(mockAgentsMd);

    const loader = new ConstitutionLoader();
    loader.load();

    expect(loader.getPolicy('Role: Jules (Release Captain)')).toContain('Merge Authority');
    expect(loader.getPolicy('Role: Codex (Engineer)')).toContain('Test Execution');
  });

  it('should validate agent actions', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(mockAgentsMd);

    const loader = new ConstitutionLoader();
    loader.load();

    expect(loader.validate('Jules', 'Merge Authority')).toBe(true);
    expect(loader.validate('Codex', 'Merge Authority')).toBe(false);
    expect(loader.validate('Codex', 'Test Execution')).toBe(true);
  });
});
