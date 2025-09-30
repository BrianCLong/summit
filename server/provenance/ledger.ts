export async function recordProvenance(ctx: any, payload: any): Promise<string> {
  // Persist to Postgres/Neo4j; return id
  return "prov_" + Date.now();
}
