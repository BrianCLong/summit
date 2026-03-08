"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildManifest = buildManifest;
const crypto_1 = require("crypto");
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function buildManifest(runId) {
    // Pull from run_ledger + materialized tables
    const { rows: steps } = await pg.query(`
    SELECT step_id, plugin_digest, params, input_digests, residency, env
    FROM run_steps WHERE run_id=$1 ORDER BY step_order`, [runId]);
    const seed = 'maestro:' + runId; // deterministic RNG seed
    const manifest = {
        plugins: [...new Set(steps.map((s) => s.plugin_digest))],
        steps,
        seed,
        residency: steps[0]?.residency || 'US',
    };
    const digest = 'sha256:' + (0, crypto_1.createHash)('sha256').update(canon(manifest)).digest('hex');
    await pg.query(`INSERT INTO run_manifest(run_id, manifest, digest, signer)
                  VALUES ($1,$2,$3,$4) ON CONFLICT (run_id) DO UPDATE SET manifest=$2, digest=$3`, [runId, manifest, digest, process.env.SIGNER_ID || null]);
    return { manifest, digest };
}
function canon(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}
