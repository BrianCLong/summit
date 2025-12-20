const CURSOR_ENCODING = 'base64url';

export function encodeCursor(offset: number): string {
  if (!Number.isFinite(offset) || offset < 0) {
    return Buffer.from('0').toString(CURSOR_ENCODING);
  }
  return Buffer.from(String(Math.floor(offset))).toString(CURSOR_ENCODING);
}

export function decodeCursor(cursor?: string | null): number {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, CURSOR_ENCODING).toString('utf8');
    const value = Number.parseInt(decoded, 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function wrapCypherWithPagination(query: string): string {
  const trimmed = query.trim().replace(/;+\s*$/, '');
  return `
    CALL {
      ${trimmed}
    }
    RETURN *
    SKIP toInteger($skip)
    LIMIT toInteger($limitPlusOne)
  `;
}

export function wrapSqlWithPagination(query: string): string {
  const trimmed = query.trim().replace(/;+\s*$/, '');
  return `
    SELECT * FROM (
      ${trimmed}
    ) as paged_query
    OFFSET $1
    LIMIT $2
  `;
}
