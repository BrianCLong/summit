"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const connectionString = process.env.COMPANYOS_DB_URL ??
    'postgres://companyos:companyos@companyos-db:5432/companyos';
exports.pool = new pg_1.Pool({
    connectionString,
    max: 10,
});
