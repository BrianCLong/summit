import neo4j from 'neo4j-driver';
import pkg from 'pg';

const { Pool } = pkg;

export function makeContext(req: any, logger: any) {
  const neo = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
  );
  const pg = new Pool({ connectionString: process.env.PG_CONNECTION });

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
