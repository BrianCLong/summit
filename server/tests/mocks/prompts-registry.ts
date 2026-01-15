
type PromptConfig = {
  meta: { id: string };
  inputs?: Record<string, string>;
  template?: string;
};

const promptMap = new Map<string, PromptConfig>([
  ['core.base@v1', { meta: { id: 'core.base@v1' }, inputs: { role: 'string', mission: 'string', constraints: 'string' } }],
  ['core.security@v1', { meta: { id: 'core.security@v1' } }],
  ['core.coding-standards@v1', { meta: { id: 'core.coding-standards@v1' } }],
  ['agent.architect@v1', { meta: { id: 'agent.architect@v1' } }],
  ['agent.security@v1', { meta: { id: 'agent.security@v1' } }],
  ['agent.engineer@v1', { meta: { id: 'agent.engineer@v1' } }],
  ['agent.qa@v1', { meta: { id: 'agent.qa@v1' } }],
  ['workflow.feature@v1', { meta: { id: 'workflow.feature@v1' } }],
  ['workflow.bugfix@v1', { meta: { id: 'workflow.bugfix@v1' } }],
  ['workflow.refactor@v1', { meta: { id: 'workflow.refactor@v1' } }],
  ['workflow.review@v1', { meta: { id: 'workflow.review@v1' } }],
]);

export class PromptRegistry {
  constructor() {}
  async initialize() {
    return Promise.resolve();
  }
  getPrompt(id: string) {
    return promptMap.get(id) || null;
  }
  getAllPrompts() {
    return Array.from(promptMap.values());
  }
  render() {
    return '';
  }
}

export const promptRegistry = new PromptRegistry();
