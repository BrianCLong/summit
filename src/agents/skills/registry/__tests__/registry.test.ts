import { SkillRegistry } from '../index';
import { BaseSkill, SkillMetadata } from '../../baseSkill';

class MockSkill extends BaseSkill<{ test: string }, { result: string }> {
  metadata: SkillMetadata = {
    name: 'test-skill',
    description: 'A mock skill for testing',
    version: '1.0.0',
    inputs: {
      type: 'object',
      properties: {
        test: {
          type: 'string',
          description: 'A test input',
        }
      },
      required: ['test'],
    },
    outputs: {
      type: 'object',
      properties: {
        result: {
          type: 'string',
          description: 'A test output',
        }
      }
    }
  };

  async execute(input: { test: string }): Promise<{ result: string }> {
    return { result: `Success: ${input.test}` };
  }
}

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  it('should register a skill', () => {
    const skill = new MockSkill();
    registry.register(skill);
    expect(registry.has('test-skill')).toBe(true);
  });

  it('should retrieve a registered skill', () => {
    const skill = new MockSkill();
    registry.register(skill);

    const retrieved = registry.get('test-skill');
    expect(retrieved).toBeDefined();
    expect(retrieved?.metadata.name).toBe('test-skill');
  });

  it('should unregister a skill', () => {
    const skill = new MockSkill();
    registry.register(skill);
    expect(registry.has('test-skill')).toBe(true);

    registry.unregister('test-skill');
    expect(registry.has('test-skill')).toBe(false);
    expect(registry.get('test-skill')).toBeUndefined();
  });

  it('should list all registered skills', () => {
    const skill = new MockSkill();
    registry.register(skill);

    const list = registry.list();
    expect(list.length).toBe(1);
    expect(list[0]).toMatchObject({
      id: 'test-skill',
      version: '1.0.0',
      description: 'A mock skill for testing',
      status: 'active'
    });
  });

  it('should execute a registered skill', async () => {
    const skill = new MockSkill();
    registry.register(skill);

    const retrieved = registry.get('test-skill');
    if (retrieved) {
      const result = await retrieved.run({ test: 'hello' });
      expect(result).toEqual({ result: 'Success: hello' });
    } else {
      fail('Skill not found in registry');
    }
  });
});
