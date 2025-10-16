import { getPostgresPool } from '../../db/postgres.js';

export const saasResolvers = {
  Query: {
    contracts: async (_: any, { tenant }: any) => {
      const pool = getPostgresPool();
      const { rows } = await pool.query(
        'SELECT id, provider AS providerTenant, consumer AS consumerTenant, scope, residency, expires_at AS "expiresAt", signature FROM trust_contracts WHERE provider=$1 OR consumer=$1',
        [tenant],
      );
      return rows;
    },
    meters: async (_: any, { tenant, since, until }: any) => {
      const pool = getPostgresPool();
      const { rows } = await pool.query(
        'SELECT ts, cpu_sec AS "cpuSec", gb_sec AS "gbSec", egress_gb AS "egressGb", dp_epsilon AS "dpEpsilon", plugin_calls AS "pluginCalls" FROM meters WHERE tenant=$1 AND ts BETWEEN $2 AND $3 ORDER BY ts',
        [tenant, since, until],
      );
      return rows;
    },
    billingExport: async (_: any, { tenant, month }: any) => {
      return `s3://${process.env.BILLING_BUCKET || 'billing'}/${tenant}/${month}.csv`;
    },
  },
  Mutation: {
    registerTrustContract: async (_: any, { input }: any) => {
      const pool = getPostgresPool();
      const {
        rows: [r],
      } = await pool.query(
        'INSERT INTO trust_contracts(provider,consumer,scope,residency,expires_at,signature) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, provider AS providerTenant, consumer AS consumerTenant, scope, residency, expires_at AS "expiresAt", signature',
        [
          input.providerTenant,
          input.consumerTenant,
          input.scope,
          input.residency,
          input.expiresAt,
          input.signature,
        ],
      );
      return r;
    },
    rotateTenantKey: async () => true,
    startCleanRoomRun: async () => 'run-cleanroom-stub',
  },
};
