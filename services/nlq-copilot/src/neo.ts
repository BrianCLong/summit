import neo4j from 'neo4j-driver';

const url = process.env.NEO4J_URL || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const pass = process.env.NEO4J_PASS || 'test';

export const driver = neo4j.driver(url, neo4j.auth.basic(user, pass));

export async function runReadonly(cypher: string, params: any = {}) {
  if (/\b(DELETE|SET\s+\w+\s*=|CREATE\b|MERGE\b)\b/i.test(cypher)) throw new Error('write_denied');
  const s = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await s.run(cypher, params);
    return res.records.map((r) => r.toObject());
  } finally {
    await s.close();
  }
}
