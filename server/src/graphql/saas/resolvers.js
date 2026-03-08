"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saasResolvers = void 0;
const postgres_js_1 = require("../../db/postgres.js");
exports.saasResolvers = {
    Query: {
        contracts: async (_, { tenant }) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { rows } = await pool.query('SELECT id, provider AS providerTenant, consumer AS consumerTenant, scope, residency, expires_at AS "expiresAt", signature FROM trust_contracts WHERE provider=$1 OR consumer=$1', [tenant]);
            return rows;
        },
        meters: async (_, { tenant, since, until }) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { rows } = await pool.query('SELECT ts, cpu_sec AS "cpuSec", gb_sec AS "gbSec", egress_gb AS "egressGb", dp_epsilon AS "dpEpsilon", plugin_calls AS "pluginCalls" FROM meters WHERE tenant=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts', [tenant, since, until]);
            return rows;
        },
        billingExport: async (_, { tenant, month }) => {
            return `s3://${process.env.BILLING_BUCKET || 'billing'}/${tenant}/${month}.csv`;
        },
    },
    Mutation: {
        registerTrustContract: async (_, { input }) => {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { rows: [r], } = await pool.query('INSERT INTO trust_contracts(provider,consumer,scope,residency,expires_at,signature) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, provider AS providerTenant, consumer AS consumerTenant, scope, residency, expires_at AS "expiresAt", signature', [
                input.providerTenant,
                input.consumerTenant,
                input.scope,
                input.residency,
                input.expiresAt,
                input.signature,
            ]);
            return r;
        },
        rotateTenantKey: async () => true,
        startCleanRoomRun: async () => 'run-cleanroom-stub',
    },
};
