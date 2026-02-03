import { jest } from '@jest/globals';

// ESM mocking helper for Jest 29+
// Usage: const mod = await mockEsmModule('../path/to/mod.js', () => ({ named: jest.fn(), default: jest.fn() }));

export async function mockEsmModule(
  spec: string,
  factory: () => Record<string, any>,
  baseUrl?: string,
) {
  const resolved = baseUrl ? new URL(spec, baseUrl).pathname : spec;
  // @ts-ignore - unstable API is sufficient for tests
  await (jest as any).unstable_mockModule(resolved, async () => factory());
  return await import(resolved);
}

// Convert default-exported objects to a shape friendly to jest ESM mocking
export function asDefault<T extends object>(obj: T) {
  return { __esModule: true, default: obj, ...obj } as any;
}
