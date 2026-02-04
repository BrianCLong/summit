describe('CI environment guardrails', () => {
  const isCi = process.env.CI === 'true';
  const ciTest = isCi ? test : test.skip;

  ciTest('uses deterministic environment defaults', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.version).toMatch(/^v20\./);
  });
});
