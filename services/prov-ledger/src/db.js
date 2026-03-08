"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
// @ts-nocheck
const pg_1 = require("pg");
const pool = new pg_1.Pool({ connectionString: process.env.PG_URL });
async function query(text, params = []) {
    return pool.query(text, params);
}
