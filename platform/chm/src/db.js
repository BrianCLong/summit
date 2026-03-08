"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPool = createPool;
const pg_1 = require("pg");
function createPool() {
    const connectionString = process.env.CHM_DATABASE_URL;
    if (!connectionString) {
        throw new Error('CHM_DATABASE_URL is required for database connectivity');
    }
    return new pg_1.Pool({ connectionString });
}
