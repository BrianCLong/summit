import assert from 'node:assert/strict';
import test from 'node:test';

import { lintPromptTemplate } from '../../../src/agents/guards/promptTemplateLint.ts';
import { assertTokenBudget } from '../../../src/agents/guards/tokenBudget.ts';

test('rejects missing token budgets', () => {
  assert.throws(() => assertTokenBudget({}), /Token budget not configured/);
});

test('accepts configured token budgets', () => {
  assert.doesNotThrow(() =>
    assertTokenBudget({ maxInputTokens: 1024, maxOutputTokens: 512 }),
  );
});

test('rejects disallowed template filters', () => {
  assert.throws(
    () => lintPromptTemplate('Hello {{ name | safe }}'),
    /Disallowed template filter/,
  );
});

test('accepts safe templates', () => {
  assert.doesNotThrow(() => lintPromptTemplate('Hello {{ name }}'));
});
