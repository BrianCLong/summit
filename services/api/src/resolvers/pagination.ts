export interface ConnectionArgs {
  first?: number | null;
  after?: string | null;
}

export interface NormalizedConnectionArgs {
  limit: number;
  after?: string | null;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function normalizeConnectionArgs(args: ConnectionArgs | undefined, fallbackLimit = DEFAULT_LIMIT): NormalizedConnectionArgs {
  const requested = args?.first ?? fallbackLimit;
  const limit = Math.min(Math.max(requested, 1), MAX_LIMIT);

  return {
    limit,
    after: args?.after ?? null,
  };
}

export function encodeCursor(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

export function decodeCursor(cursor?: string | null): string | null {
  if (!cursor) {
    return null;
  }

  try {
    return Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    return null;
  }
}
