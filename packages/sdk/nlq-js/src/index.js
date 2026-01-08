import neo4j from "neo4j-driver";
/**
 * Very small NL -> Cypher compiler.
 * This is a placeholder implementation. It recognises a tiny
 * subset of English queries and always returns parameterised Cypher.
 */
export function compile(nl) {
  const normalized = nl.toLowerCase();
  if (/\b(create|merge|delete|set|drop)\b/.test(normalized)) {
    throw new Error("write operations are not allowed");
  }
  // rudimentary mapping for demo purposes
  if (normalized.includes("people")) {
    return {
      cypher: "MATCH (p:Person) RETURN p LIMIT $limit",
      params: { limit: 25 },
      costEstimate: { nodes: 25, edges: 0, rows: 25, safe: true },
    };
  }
  return {
    cypher: "MATCH (n) RETURN n LIMIT $limit",
    params: { limit: 25 },
    costEstimate: { nodes: 25, edges: 0, rows: 25, safe: true },
  };
}
/**
 * Execute a Cypher query in read-only sandbox mode.
 * The provided Neo4j driver must be configured with a read-only user.
 */
export async function executeSandbox(driver, cypher, params) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params);
    return {
      rows: result.records.map((r) => r.toObject()),
      truncated: false,
      warnings: [],
    };
  } finally {
    await session.close();
  }
}
//# sourceMappingURL=index.js.map
