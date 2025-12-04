import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver() {
  if (!driver) {
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
        // Fallback or error, but for now we might be in test mode without env
        // If strict, we throw.
        if (process.env.NODE_ENV === 'test') {
            // Return a mock-able structure or throw if not mocked
             throw new Error("Neo4j env vars missing in test");
        }
        console.warn("Neo4j environment variables missing");
    }

    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'),
      { disableLosslessIntegers: true },
    );
  }
  return driver;
}

export async function runCypher<T = any>(
  cypher: string,
  params: Record<string, any> = {},
) {
  const session = getDriver().session({
    defaultAccessMode: neo4j.session.WRITE,
  });
  try {
    const res = await session.run(cypher, params);
    return res.records.map((r) => r.toObject()) as T[];
  } finally {
    await session.close();
  }
}

export async function closeDriver() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}
