import { validateAction } from '../../../../agents/router/intent_router';

describe('Deny-by-default tool policy', () => {
  it('should deny execute intent if tool is not in allowlist', () => {
    const isAllowed = validateAction('execute', ['search']);
    expect(isAllowed).toBe(false);
  });

  it('should allow execute intent if tool is in allowlist', () => {
    const isAllowed = validateAction('execute', ['execute_command', 'search']);
    expect(isAllowed).toBe(true);
  });

  it('should default allow safe intents like qa and summarize', () => {
    expect(validateAction('qa', [])).toBe(true);
    expect(validateAction('summarize', [])).toBe(true);
  });
});
