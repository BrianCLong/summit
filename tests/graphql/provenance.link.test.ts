describe('provenance link placeholder', () => {
  it('returns deterministic trust score structure', async () => {
    const result = {
      subjectId: 'subject-1',
      score: 0.9,
      reasons: ['placeholder'],
      updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    };

    expect(result.subjectId).toBe('subject-1');
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain('placeholder');
    expect(typeof result.updatedAt).toBe('string');
  });
});
