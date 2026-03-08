"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMeters = recordMeters;
exports.exportBillingCSV = exportBillingCSV;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function recordMeters(tenant, m) {
    await pg.query(`INSERT INTO meters(tenant, ts, cpu_sec, gb_sec, egress_gb, dp_epsilon, plugin_calls)
     VALUES ($1, now(), $2, $3, $4, $5, $6)`, [tenant, m.cpuSec, m.gbSec, m.egressGb, m.dpEpsilon, m.pluginCalls]);
}
async function exportBillingCSV(tenant, month) {
    // Placeholder: return an S3 URI where an export job would write.
    return `s3://billing/${tenant}/${month}.csv`;
}
