import neo4j, { Driver } from 'neo4j-driver';

/**
 * Neo4j Driver Singleton
 *
 * This module ensures a single Driver instance is reused across the application.
 * It handles connection details via environment variables.
 */

let driver: Driver | null = null;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
      {
        // Javascript numbers are 64-bit floats (53-bit integer precision).
        // Neo4j integers are 64-bit signed integers.
        // disableLosslessIntegers: true forces Neo4j integers to standard JS numbers,
        // which risks precision loss for very large IDs, but simplifies DTOs.
        // Ensure IDs used in Neo4j fit within Number.MAX_SAFE_INTEGER.
        disableLosslessIntegers: true
      },
    );
  }
  return driver;
}

/**
 * Helper to run a Cypher query with automatic session management.
 *
 * @param cypher - The Cypher query string.
 * @param params - Key-value pairs for Cypher parameters.
 * @returns An array of records converted to plain objects.
 *
 * Note:
 * - Uses 'WRITE' access mode by default.
 * - Opens and closes a session for *each* call. For high-throughput scenarios,
 *   consider managing sessions manually to use transactions more efficiently.
 */
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
