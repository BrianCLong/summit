"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.wrapCypherWithPagination = wrapCypherWithPagination;
exports.wrapSqlWithPagination = wrapSqlWithPagination;
const CURSOR_ENCODING = 'base64url';
function encodeCursor(offset) {
    if (!Number.isFinite(offset) || offset < 0) {
        return Buffer.from('0').toString(CURSOR_ENCODING);
    }
    return Buffer.from(String(Math.floor(offset))).toString(CURSOR_ENCODING);
}
function decodeCursor(cursor) {
    if (!cursor)
        return 0;
    try {
        const decoded = Buffer.from(cursor, CURSOR_ENCODING).toString('utf8');
        const value = Number.parseInt(decoded, 10);
        return Number.isFinite(value) && value >= 0 ? value : 0;
    }
    catch {
        return 0;
    }
}
function wrapCypherWithPagination(query) {
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
function wrapSqlWithPagination(query) {
    const trimmed = query.trim().replace(/;+\s*$/, '');
    return `
    SELECT * FROM (
      ${trimmed}
    ) as paged_query
    OFFSET $1
    LIMIT $2
  `;
}
