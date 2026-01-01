import { detectRememberIntent } from '../src/utils/keywordDetection.js';

describe('detectRememberIntent', () => {
  it('detects a remember phrase', () => {
    const result = detectRememberIntent('Please remember that this project uses Bun');
    expect(result.matched).toBe(true);
    expect(result.extracted).toContain('this project uses Bun');
    expect(result.scope).toBe('project');
  });

  it('detects explicit user scope', () => {
    const result = detectRememberIntent('Save this for me everywhere: prefer dark mode');
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('user');
  });

  it('returns no match when absent', () => {
    const result = detectRememberIntent('Hello world');
    expect(result.matched).toBe(false);
  });
});
