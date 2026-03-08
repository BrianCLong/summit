"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargeEpsilon = chargeEpsilon;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function chargeEpsilon(tenant, dataset, eps) {
    const ym = new Date().toISOString().slice(0, 7);
    await pg.query('BEGIN');
    const { rows: [b], } = await pg.query(`SELECT epsilon_limit, epsilon_spent FROM dp_budgets WHERE tenant=$1 AND dataset=$2 AND month=$3 FOR UPDATE`, [tenant, dataset, ym]);
    if (!b)
        throw new Error('dp budget not configured');
    const next = Number(b.epsilon_spent) + eps;
    if (next > Number(b.epsilon_limit)) {
        await pg.query('ROLLBACK');
        return { ok: false, level: 'exhausted' };
    }
    await pg.query(`UPDATE dp_budgets SET epsilon_spent=$4 WHERE tenant=$1 AND dataset=$2 AND month=$3`, [tenant, dataset, ym, next]);
    await pg.query('COMMIT');
    return { ok: true, remaining: Number(b.epsilon_limit) - next };
}
