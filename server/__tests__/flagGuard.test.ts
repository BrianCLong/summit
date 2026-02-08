/**
 * Unit tests for the flagGuard middleware.
 *
 * Validates that the flag-gated guardrail correctly blocks or allows
 * resolver execution based on environment variable flag state.
 */

// Mock GraphQL context
const mockContext = {
  user: { id: 'user-1', roles: ['analyst'] },
} as any;

const mockInfo = {} as any;

describe('flagGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
    // Ensure we're in "test" environment so default behavior doesn't interfere
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Dynamic import to pick up env changes
  async function loadFlagGuard() {
    // Clear module cache to get fresh env reads
    jest.resetModules();
    const mod = await import('../src/graphql/utils/flagGuard.js');
    return mod.flagGuard;
  }

  it('should allow resolver when flag is explicitly enabled', async () => {
    process.env.FLAG_FEATURE_INVESTIGATION_DELETE = 'true';
    const flagGuard = await loadFlagGuard();

    const resolver = jest.fn().mockResolvedValue({ deleted: true });
    const guarded = flagGuard(resolver, 'feature.investigation.delete');

    const result = await guarded(null, { id: 'inv-1' }, mockContext, mockInfo);

    expect(resolver).toHaveBeenCalledWith(null, { id: 'inv-1' }, mockContext, mockInfo);
    expect(result).toEqual({ deleted: true });
  });

  it('should block resolver when flag is explicitly disabled', async () => {
    process.env.FLAG_FEATURE_INVESTIGATION_DELETE = 'false';
    process.env.NODE_ENV = 'production'; // Ensure prod-like behavior
    const flagGuard = await loadFlagGuard();

    const resolver = jest.fn().mockResolvedValue(true);
    const guarded = flagGuard(resolver, 'feature.investigation.delete');

    await expect(guarded(null, { id: 'inv-1' }, mockContext, mockInfo)).rejects.toThrow(
      /Operation disabled by feature flag/,
    );
    expect(resolver).not.toHaveBeenCalled();
  });

  it('should block resolver in production when flag is not set', async () => {
    delete process.env.FLAG_FEATURE_INVESTIGATION_DELETE;
    process.env.NODE_ENV = 'production';
    const flagGuard = await loadFlagGuard();

    const resolver = jest.fn().mockResolvedValue(true);
    const guarded = flagGuard(resolver, 'feature.investigation.delete');

    await expect(guarded(null, { id: 'inv-1' }, mockContext, mockInfo)).rejects.toThrow(
      /feature\.investigation\.delete/,
    );
    expect(resolver).not.toHaveBeenCalled();
  });

  it('should allow resolver in non-production when flag is not set', async () => {
    delete process.env.FLAG_FEATURE_INVESTIGATION_DELETE;
    process.env.NODE_ENV = 'development';
    const flagGuard = await loadFlagGuard();

    const resolver = jest.fn().mockResolvedValue(true);
    const guarded = flagGuard(resolver, 'feature.investigation.delete');

    const result = await guarded(null, { id: 'inv-1' }, mockContext, mockInfo);

    expect(resolver).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should support custom error messages', async () => {
    process.env.FLAG_FEATURE_INVESTIGATION_BULK_OPERATIONS = 'false';
    process.env.NODE_ENV = 'production';
    const flagGuard = await loadFlagGuard();

    const resolver = jest.fn();
    const guarded = flagGuard(resolver, 'feature.investigation.bulk-operations', {
      message: 'Bulk operations are not available in your environment',
    });

    await expect(guarded(null, {}, mockContext, mockInfo)).rejects.toThrow(
      'Bulk operations are not available in your environment',
    );
  });

  it('should accept flag value "1" as enabled', async () => {
    process.env.FLAG_FEATURE_OSINT_INGESTION = '1';
    const flagGuard = await loadFlagGuard();

    const resolver = jest.fn().mockResolvedValue('ok');
    const guarded = flagGuard(resolver, 'feature.osint.ingestion');

    const result = await guarded(null, {}, mockContext, mockInfo);
    expect(result).toBe('ok');
  });
});
