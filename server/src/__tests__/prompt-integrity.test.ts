import { PromptRegistry } from '../../prompts/registry';
import path from 'path';

describe('Prompt Integrity', () => {
  beforeAll(async () => {
    const promptsDir = path.resolve(__dirname, '../../../prompts');
    const registry = new PromptRegistry(promptsDir);
    await registry.initialize();
    (global as any).testRegistry = registry;
  });

  it('should load all core prompts', () => {
    const registry = (global as any).testRegistry;
    const coreIds = ['core.base@v1', 'core.security@v1', 'core.coding-standards@v1'];

    for (const id of coreIds) {
      const prompt = registry.getPrompt(id);
      expect(prompt).toBeDefined();
      expect(prompt.meta.id).toBe(id);
    }
  });

  it('should load all agent prompts', () => {
    const registry = (global as any).testRegistry;
    const agentIds = [
      'agent.architect@v1',
      'agent.security@v1',
      'agent.engineer@v1',
      'agent.qa@v1'
    ];

    for (const id of agentIds) {
      const prompt = registry.getPrompt(id);
      expect(prompt).toBeDefined();
      expect(prompt.meta.id).toBe(id);
    }
  });

  it('should load all workflow prompts', () => {
    const registry = (global as any).testRegistry;
    const workflowIds = [
      'workflow.feature@v1',
      'workflow.bugfix@v1',
      'workflow.refactor@v1',
      'workflow.review@v1'
    ];

    for (const id of workflowIds) {
      const prompt = registry.getPrompt(id);
      expect(prompt).toBeDefined();
      expect(prompt.meta.id).toBe(id);
    }
  });

  it('should validate standard inputs in core prompts', () => {
    const registry = (global as any).testRegistry;
    const base = registry.getPrompt('core.base@v1');
    expect(base.inputs).toHaveProperty('role');
    expect(base.inputs).toHaveProperty('mission');
    expect(base.inputs).toHaveProperty('constraints');
  });
});
