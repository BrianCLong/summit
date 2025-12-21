import neo4j from 'neo4j-driver';

const url = process.env.NEO4J_URL || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const pass = process.env.NEO4J_PASS || 'test';
export const driver = neo4j.driver(url, neo4j.auth.basic(user, pass));

const WRITE_PATTERN = /\b(CREATE|MERGE|DELETE|DETACH|SET\s+\w+\s*=|DROP|GRANT|REVOKE|LOAD|ALTER|REMOVE)\b/i;

export function assertReadonlyQuery(cypher: string, allowProcedures: string[] = []) {
  const trimmed = cypher.trim();
  if (!trimmed) throw new Error('empty_query');
  if (WRITE_PATTERN.test(trimmed)) throw new Error('write_denied');
  if (/\bCALL\b/i.test(trimmed)) {
    const allowed = allowProcedures.some((proc) => trimmed.toLowerCase().includes(proc.toLowerCase()));
    if (!allowed) throw new Error('procedure_denied');
  }
}

export async function runReadonly(
  cypher: string,
  params: Record<string, unknown> = {},
  opts: { allowProcedures?: string[]; driverInstance?: neo4j.Driver } = {}
) {
  assertReadonlyQuery(cypher, opts.allowProcedures);
  const activeDriver = opts.driverInstance ?? driver;
  const session = activeDriver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.run(cypher, params);
    return res.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
}

export async function assertConnectivity(activeDriver: neo4j.Driver = driver) {
  await activeDriver.verifyAuthentication?.();
  await activeDriver.verifyConnectivity();
}

export async function closeDriver(activeDriver: neo4j.Driver = driver) {
  await activeDriver.close();
}
