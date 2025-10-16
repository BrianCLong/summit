import { analyzeText } from './detector';

describe('analyzeText', () => {
  test('detects emotional language', () => {
    const res = analyzeText('I am furious and full of rage');
    expect(res.score).toBeGreaterThan(0);
    expect(res.tags).toContain('emotion:anger');
  });

  test('detects bias phrases', () => {
    const res = analyzeText('Everyone knows this is fake news');
    expect(res.tags).toContain('bias');
  });
});
