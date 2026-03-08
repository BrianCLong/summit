"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryPool = void 0;
const pg_mem_1 = require("pg-mem");
const createMemoryPool = () => {
    const db = (0, pg_mem_1.newDb)({ autoCreateForeignKeyIndices: true });
    const pg = db.adapters.createPg();
    const pool = new pg.Pool();
    return { pool };
};
exports.createMemoryPool = createMemoryPool;
