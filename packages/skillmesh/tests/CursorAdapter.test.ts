import { CursorAdapter } from '../src/adapters/CursorAdapter';
import { Skill, SkillManifest } from '../src/core/types';
import * as path from 'path';
import * as os from 'os';

describe('CursorAdapter', () => {
  let adapter: CursorAdapter;
  let mockSkill: Skill;

  beforeEach(() => {
    adapter = new CursorAdapter();
    const manifest: SkillManifest = {
      name: 'test-skill',
      version: '1.0.0',
      description: 'A test skill'
    };
    mockSkill = {
      id: 'test-skill',
      manifest,
      source: { type: 'local', path: '/tmp/test-skill' },
      location: '/tmp/test-skill'
    };
  });

  it('should be named cursor', () => {
    expect(adapter.name).toBe('cursor');
  });

  it('should return copy mode target', async () => {
    const target = await adapter.getInstallTarget(mockSkill);
    expect(target).not.toBeNull();
    expect(target?.tool).toBe('cursor');
    expect(target?.mode).toBe('copy');
    expect(target?.location).toContain('test-skill');
  });
});
