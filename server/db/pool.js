"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
exports.pool = new pg_1.Pool({
    max: Number(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
