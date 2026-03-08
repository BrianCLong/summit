describe('test isolation', () => {
  test('allows env mutation within a test', () => {
    process.env.__TEST_ISOLATION_FLAG = 'set';
    expect(process.env.__TEST_ISOLATION_FLAG).toBe('set');
  });

  test('restores env mutations between tests', () => {
    expect(process.env.__TEST_ISOLATION_FLAG).toBeUndefined();
  });
});
