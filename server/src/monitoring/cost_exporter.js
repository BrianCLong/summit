"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCostExporter = startCostExporter;
const client = __importStar(require("prom-client"));
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const cost = new client.Counter({
    name: 'maestro_cost_usd_total',
    help: 'Total cost USD',
    labelNames: ['tenant', 'type'],
});
const R = {
    cpu: parseFloat(process.env.RATE_CPU_SEC_USD || '0.000011'),
    gpu: parseFloat(process.env.RATE_GPU_SEC_USD || '0.0006'),
    gb: parseFloat(process.env.RATE_GB_SEC_USD || '0.000002'),
    egr: parseFloat(process.env.RATE_EGRESS_GB_USD || '0.09'),
};
function startCostExporter(intervalMs = 60000) {
    setInterval(async () => {
        const { rows: [wm], } = await pg.query(`SELECT last_ts FROM cost_exporter_watermarks WHERE id=true`);
        const since = wm?.last_ts || '1970-01-01';
        const { rows } = await pg.query(`
      SELECT tenant,
             SUM(cpu_sec) cpu, SUM(gb_sec) gb, SUM(egress_gb) egr
      FROM meters WHERE ts > $1 GROUP BY tenant`, [since]);
        // GPU seconds optionally in gpu_meters
        const { rows: gRows } = await pg.query(`SELECT tenant, SUM(gpu_sec) gpu FROM gpu_meters WHERE ts > $1 GROUP BY tenant`, [since]);
        const gpuByTenant = new Map(gRows.map((r) => [r.tenant, Number(r.gpu || 0)]));
        // increment counters by delta amounts
        for (const r of rows) {
            // const costs = result.rows.map((r: any) => parseFloat(r.daily_cost));
            const t = r.tenant;
            const usdCpu = Number(r.cpu || 0) * R.cpu;
            const usdGb = Number(r.gb || 0) * R.gb;
            const usdEgr = Number(r.egr || 0) * R.egr;
            const usdGpu = Number(gpuByTenant.get(t) || 0) * R.gpu;
            cost.labels(t, 'cpu').inc(usdCpu);
            cost.labels(t, 'gpu').inc(usdGpu);
            cost.labels(t, 'mem').inc(usdGb);
            cost.labels(t, 'egress').inc(usdEgr);
        }
        await pg.query(`UPDATE cost_exporter_watermarks SET last_ts=now() WHERE id=true`);
    }, intervalMs);
}
