"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeScaleHints = computeScaleHints;
const forecast_1 = require("./forecast");
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function computeScaleHints() {
    const { rows } = await pg.query(`SELECT date_trunc('minute', ts) m, count(*) q FROM run_queue WHERE ts > now()-interval '2 hours' GROUP BY 1 ORDER BY 1`);
    const series = rows.map((r) => Number(r.q));
    const next = (0, forecast_1.holtWinters)(series);
    // publish to KEDA via annotations or to Redis that controller reads
    return { minuteAhead: Math.round(next) };
}
