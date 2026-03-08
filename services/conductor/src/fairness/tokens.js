"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.charge = charge;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function charge(tenant, cpuSec, gpuSec) {
    await pg.query('BEGIN');
    const { rows: [t], } = await pg.query(`SELECT cpu_tokens, gpu_tokens, refill_cpu_per_s, refill_gpu_per_s, updated_at FROM tenant_tokens WHERE tenant=$1 FOR UPDATE`, [tenant]);
    const now = new Date();
    const dt = (now.getTime() - new Date(t.updated_at).getTime()) / 1000;
    const cpu = Math.max(0, Number(t.cpu_tokens) + dt * Number(t.refill_cpu_per_s) - cpuSec);
    const gpu = Math.max(0, Number(t.gpu_tokens) + dt * Number(t.refill_gpu_per_s) - gpuSec);
    await pg.query(`UPDATE tenant_tokens SET cpu_tokens=$2, gpu_tokens=$3, updated_at=now() WHERE tenant=$1`, [tenant, cpu, gpu]);
    await pg.query('COMMIT');
    return {
        allowed: cpuSec <= Number(t.cpu_tokens) + dt * Number(t.refill_cpu_per_s),
    };
}
