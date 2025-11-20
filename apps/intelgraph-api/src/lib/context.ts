import neo4j from 'neo4j-driver';
import pkg, { type Pool as PgPool } from 'pg';

const { Pool } = pkg;

let cachedNeoDriver: neo4j.Driver | null = null;
let cachedPgPool: PgPool | null = null;

function getNeoDriver(): neo4j.Driver {
  if (!cachedNeoDriver) {
    cachedNeoDriver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
    );
  }
  return cachedNeoDriver;
}

function getPgPool(): PgPool {
  if (!cachedPgPool) {
    cachedPgPool = new Pool({ connectionString: process.env.PG_CONNECTION });
  }
  return cachedPgPool;
}

export function makeContext(req: any, logger: any) {
  const neo = getNeoDriver();
  const pg = getPgPool();

  // Extract user from JWT payload attached by express-jwt middleware
  const auth = req.auth || {}; // req.auth will contain the decoded JWT payload
  const user = {
    sub: auth.sub || 'anonymous',
    tenantId: auth.tenantId || null, // Assuming tenantId is in the JWT payload
    roles: auth.roles || [], // Assuming roles are in the JWT payload
    isAuthenticated: !!auth.sub, // Check if a subject exists in the JWT
  };

  return {
    logger,
    user,
    neo,
    pg: {
      one: async (q: string, params: any[] = []) =>
        (await pg.query(q, params)).rows[0],
      oneOrNone: async (q: string, params: any[] = []) =>
        (await pg.query(q, params)).rows?.[0] || null,
      any: async (q: string, params: any[] = []) =>
        (await pg.query(q, params)).rows,
    },
  };
}
