"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pg = void 0;
const pg_1 = require("pg");
exports.pg = new pg_1.Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
});
