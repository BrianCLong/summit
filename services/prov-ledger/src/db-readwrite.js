"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// @ts-nocheck
const pg_1 = require("pg");
const rw = new pg_1.Pool({ connectionString: process.env.PG_RW_URL || process.env.PG_URL });
const ro = new pg_1.Pool({ connectionString: process.env.PG_RO_URL || process.env.PG_URL });
exports.db = {
    write: (query, params) => rw.query(query, params),
    read: (query, params) => ro.query(query, params)
};
