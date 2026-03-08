"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePipelineDef = savePipelineDef;
exports.getPipelineDef = getPipelineDef;
const postgres_js_1 = require("../postgres.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const logger = logger_js_1.default.child({ name: 'pipelines-repo' });
async function ensureTable() {
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_defs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        nodes JSONB NOT NULL,
        edges JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    }
    catch (e) {
        logger.warn({ err: e }, 'ensure pipeline_defs failed (mock mode?)');
    }
}
async function savePipelineDef(id, name, nodes, edges) {
    await ensureTable();
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        await pool.query(`INSERT INTO pipeline_defs (id, name, nodes, edges)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, nodes=EXCLUDED.nodes, edges=EXCLUDED.edges, updated_at=NOW()`, [id, name, JSON.stringify(nodes), JSON.stringify(edges)]);
        return { ok: true };
    }
    catch (e) {
        logger.warn({ err: e }, 'savePipelineDef failed');
        return { ok: false };
    }
}
async function getPipelineDef(id) {
    await ensureTable();
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        const res = await pool.query(`SELECT id, name, nodes, edges, updated_at FROM pipeline_defs WHERE id=$1`, [id]);
        if (!res.rows.length)
            return null;
        const r = res.rows[0];
        return {
            id: r.id,
            name: r.name,
            nodes: r.nodes,
            edges: r.edges,
            updated_at: r.updated_at,
        };
    }
    catch (e) {
        logger.warn({ err: e }, 'getPipelineDef failed');
        return null;
    }
}
