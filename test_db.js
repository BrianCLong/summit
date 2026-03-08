"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_ts_1 = require("./server/src/db/postgres.ts");
async function test() {
    const pool = (0, postgres_ts_1.getPostgresPool)();
    const res = await pool.query("SELECT 1 as x");
    console.log(res);
}
test().catch(console.error);
