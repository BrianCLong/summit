import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
      { disableLosslessIntegers: true }
    );
  }
  return driver;
}

export async function runCypher<T = any>(cypher: string, params: Record<string, any> = {}) {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const res = await session.run(cypher, params);
    return res.records.map(r => r.toObject()) as T[];
  } finally {
    await session.close();
  }
}
