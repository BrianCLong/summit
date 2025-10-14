describe('GraphQL contract placeholder', () => {
  it('returns a stable version payload', () => {
    const response = { data: { ok: true, version: 'test-1.0.0' }, errors: undefined };
    expect(response.errors).toBeUndefined();
    expect(response.data.ok).toBe(true);
    expect(response.data.version).toMatch(/^test-/);
  });
});
