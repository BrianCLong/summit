import { SkillResolver } from '../resolver.js';
import { SkillManifest } from '../types.js';

describe('SkillResolver', () => {
  const resolver = new SkillResolver();

  const testSkill: SkillManifest = {
    schema_version: 'v2',
    metadata: {
      name: 'test-skill',
      version: '1.0.0',
      description: 'test'
    },
    triggers: {
      intents: ['deploy app', 'release'],
      file_patterns: ['package.json', '**/*.ts']
    },
    steps: []
  };

  const skills = [testSkill];

  it('should resolve by intent', () => {
    const result = resolver.resolve('I want to deploy app', {}, skills);
    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('test-skill');
  });

  it('should resolve by keyword (partial intent)', () => {
     // Our implementation uses intent substring matching, which acts like keywords if intent is multi-word
     const result = resolver.resolve('release', {}, skills);
     expect(result).toHaveLength(1);
  });

  it('should not resolve unrelated intent', () => {
    const result = resolver.resolve('foo bar', {}, skills);
    expect(result).toHaveLength(0);
  });

  it('should resolve by file pattern', () => {
    const result = resolver.resolve('do something', { files: ['package.json'] }, skills);
    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('test-skill');
  });

  it('should resolve by file pattern (glob)', () => {
    const result = resolver.resolve('do something', { files: ['src/index.ts'] }, skills);
    expect(result).toHaveLength(1);
  });

  it('should not resolve if file does not match', () => {
    const result = resolver.resolve('do something', { files: ['README.md'] }, skills);
    expect(result).toHaveLength(0);
  });
});
