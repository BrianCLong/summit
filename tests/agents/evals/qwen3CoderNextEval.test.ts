import { lintPromptTemplate } from '../../../src/agents/guards/promptTemplateLint.js';
import { assertTokenBudget } from '../../../src/agents/guards/tokenBudget.js';

describe('Qwen3 Coder Next guards', () => {
  it('rejects missing token budgets', () => {
    expect(() => assertTokenBudget({})).toThrow('Token budget not configured');
  });

  it('accepts configured token budgets', () => {
    expect(() =>
      assertTokenBudget({ maxInputTokens: 1024, maxOutputTokens: 512 }),
    ).not.toThrow();
  });

  it('rejects disallowed template filters', () => {
    expect(() => lintPromptTemplate('Hello {{ name | safe }}')).toThrow(
      'Disallowed template filter',
    );
  });

  it('accepts safe templates', () => {
    expect(() => lintPromptTemplate('Hello {{ name }}')).not.toThrow();
  });
});
