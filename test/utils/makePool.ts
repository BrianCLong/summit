export type QueryRow = Record<string, unknown>;
export function makePool(rows: QueryRow[] = [], overrides: Partial<any> = {}) {
  const res = { rows, rowCount: rows.length };
  const query = jest.fn(async () => res);
  return {
    query,
    connect: jest.fn(async () => ({ query, release: jest.fn() })),
    end: jest.fn(),
    ...overrides
  };
}
