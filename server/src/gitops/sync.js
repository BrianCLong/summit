"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRunbooks = syncRunbooks;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const pg_1 = require("pg");
const verify_js_1 = require("./verify.js");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function syncRunbooks(baseDir) {
    const dir = baseDir ||
        process.env.GITOPS_PATH ||
        path_1.default.resolve(process.cwd(), 'runbooks');
    let count = 0;
    async function visit(d) {
        const entries = await promises_1.default.readdir(d, { withFileTypes: true });
        for (const e of entries) {
            const p = path_1.default.join(d, e.name);
            if (e.isDirectory())
                await visit(p);
            else if (e.name === 'runbook.yaml') {
                const pkgDir = path_1.default.dirname(p);
                const parts = pkgDir.split(path_1.default.sep);
                const version = parts.pop();
                const name = parts.pop();
                const family = parts.pop();
                const v = await (0, verify_js_1.verifyPackage)(pkgDir).catch(() => ({ ok: false }));
                await pg.query(`INSERT INTO runbook_versions(family,name,version,entry_path,signed,active)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (family,name,version) DO UPDATE SET entry_path=$4, signed=$5`, [family, name, version, p, v.ok, false]);
                count++;
            }
        }
    }
    await visit(dir);
    return { synced: count };
}
