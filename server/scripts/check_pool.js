"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_js_1 = require("../src/db/postgres.js");
const pool = (0, postgres_js_1.getPostgresPool)();
console.log('Pool keys:', Object.keys(pool));
console.log('Pool totalCount:', pool.totalCount);
console.log('Pool healthCheck type:', typeof pool.healthCheck);
console.log('Pool query type:', typeof pool.query);
if (typeof pool.healthCheck !== 'function') {
    console.error('FAIL: healthCheck is not a function');
    process.exit(1);
}
if (typeof pool.query !== 'function') {
    console.error('FAIL: query is not a function');
    process.exit(1);
}
console.log('SUCCESS: Pool shape verification passed.');
process.exit(0);
