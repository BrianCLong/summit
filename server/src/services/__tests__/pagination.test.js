"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pagination_js_1 = require("../pagination.js");
(0, globals_1.describe)('pagination helpers', () => {
    (0, globals_1.it)('roundtrips cursor encoding', () => {
        (0, globals_1.expect)((0, pagination_js_1.decodeCursor)((0, pagination_js_1.encodeCursor)(0))).toBe(0);
        (0, globals_1.expect)((0, pagination_js_1.decodeCursor)((0, pagination_js_1.encodeCursor)(42))).toBe(42);
        (0, globals_1.expect)((0, pagination_js_1.decodeCursor)(null)).toBe(0);
        (0, globals_1.expect)((0, pagination_js_1.decodeCursor)('invalid')).toBe(0);
    });
    (0, globals_1.it)('wraps cypher with SKIP/LIMIT pagination', () => {
        const wrapped = (0, pagination_js_1.wrapCypherWithPagination)('MATCH (n) RETURN n');
        (0, globals_1.expect)(wrapped).toContain('CALL {');
        (0, globals_1.expect)(wrapped).toContain('MATCH (n) RETURN n');
        (0, globals_1.expect)(wrapped).toContain('SKIP toInteger($skip)');
        (0, globals_1.expect)(wrapped).toContain('LIMIT toInteger($limitPlusOne)');
    });
    (0, globals_1.it)('wraps SQL with OFFSET/LIMIT pagination', () => {
        const wrapped = (0, pagination_js_1.wrapSqlWithPagination)('SELECT * FROM widgets');
        (0, globals_1.expect)(wrapped).toContain('SELECT * FROM (');
        (0, globals_1.expect)(wrapped).toContain('SELECT * FROM widgets');
        (0, globals_1.expect)(wrapped).toContain('OFFSET $1');
        (0, globals_1.expect)(wrapped).toContain('LIMIT $2');
    });
});
