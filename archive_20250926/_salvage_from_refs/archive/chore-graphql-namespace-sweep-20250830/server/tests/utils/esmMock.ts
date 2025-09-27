// ESM mocking helper for Jest 29+
// Usage: const mod = await mockEsmModule('../path/to/mod.js', () => ({ named: jest.fn(), default: jest.fn() }));

export async function mockEsmModule(spec: string, factory: () => Record<string, any>) {
  // @ts-ignore - unstable API is sufficient for tests
  await (jest as any).unstable_mockModule(spec, async () => factory());
  return await import(spec);
}

// Convert default-exported objects to a shape friendly to jest ESM mocking
export function asDefault<T extends object>(obj: T) {
  return { __esModule: true, default: obj, ...obj } as any;
}

