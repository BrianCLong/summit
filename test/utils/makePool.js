"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePool = makePool;
function makePool(rows = [], overrides = {}) {
    const res = { rows, rowCount: rows.length };
    const query = jest.fn(async () => res);
    return {
        query,
        connect: jest.fn(async () => ({ query, release: jest.fn() })),
        end: jest.fn(),
        ...overrides,
    };
}
