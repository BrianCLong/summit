"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url = process.env.SHADOW_DB_URL;
const sqls = fs_1.default
    .readdirSync('server/src/migrations')
    .filter((x) => x.endsWith('.sql'))
    .map((f) => fs_1.default.readFileSync(path_1.default.join('server/src/migrations', f), 'utf8'));
(async () => {
    const c = new pg_1.Client({ connectionString: url });
    await c.connect();
    await c.query('BEGIN');
    for (const s of sqls)
        await c.query(s);
    const locks = await c.query('SELECT mode,granted FROM pg_locks WHERE NOT granted');
    if (locks.rowCount > 0) {
        console.error('❌ would block locks:', locks.rows);
        process.exit(1);
    }
    await c.query('ROLLBACK');
    await c.end();
    console.log('✅ dry-run OK');
})();
