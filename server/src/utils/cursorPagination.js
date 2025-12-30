const CURSOR_VERSION = 1;

function encodeCursor(offset, limit) {
  const payload = JSON.stringify({ v: CURSOR_VERSION, offset, limit });
  return Buffer.from(payload).toString('base64url');
}

function decodeCursor(cursor, fallback) {
  if (!cursor || typeof cursor !== 'string') {return fallback;}
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed.v !== CURSOR_VERSION) {return fallback;}
    const offset = Number.isFinite(parsed.offset) ? parsed.offset : fallback.offset;
    const limit = Number.isFinite(parsed.limit) ? parsed.limit : fallback.limit;
    return { offset, limit };
  } catch {
    return fallback;
  }
}

function normalizeLimit(limit, defaultValue, max = 1000) {
  const asNumber = Number(limit);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {return defaultValue;}
  return Math.min(asNumber, max);
}

function buildPageInfo(offset, limit, received) {
  const nextOffset = offset + received;
  return {
    offset,
    limit,
    nextCursor: received >= limit ? encodeCursor(nextOffset, limit) : null,
    previousCursor:
      offset > 0 ? encodeCursor(Math.max(0, offset - limit), limit) : null,
    hasMore: received >= limit,
  };
}

module.exports = {
  encodeCursor,
  decodeCursor,
  normalizeLimit,
  buildPageInfo,
};
