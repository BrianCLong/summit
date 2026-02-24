import fs from "node:fs";
import path from "node:path";
import { CheckResult } from "../lib/types";
import { getPgPool } from "../lib/pg";
import { getNeo4jDriver } from "../lib/neo4j";

export async function referentialCheck(): Promise<CheckResult> {
  const pg = getPgPool();
  const neo4j = getNeo4jDriver();
  const session = neo4j.session();

  const details: Record<string, any> = {};
  let failed = false;

  try {
    // 1. Get IDs from Postgres
    // For MWS, we hardcode the table 'customer' or use a mapping.
    // We'll assume 'customer' table and 'id' column for this specific check wrapper.
    const pgRes = await pg.query("SELECT id FROM customer");
    const pgIds = new Set(pgRes.rows.map((r) => r.id));

    // 2. Get IDs from Neo4j using the external Cypher file
    const cypherPath = path.join(process.cwd(), "checks/referential.cypher");
    const cypherQuery = fs.readFileSync(cypherPath, "utf-8");

    const neoRes = await session.run(cypherQuery);
    const neoIds = new Set(neoRes.records.map((r) => r.get("id").toNumber()));

    // 3. Compare
    const missingInPg = [...neoIds].filter((x) => !pgIds.has(x)).sort();
    const missingInNeo = [...pgIds].filter((x) => !neoIds.has(x)).sort();

    details["missing_in_pg_count"] = missingInPg.length;
    details["missing_in_neo4j_count"] = missingInNeo.length;

    if (missingInPg.length > 0) details["missing_in_pg_ids"] = missingInPg.slice(0, 10);
    if (missingInNeo.length > 0) details["missing_in_neo4j_ids"] = missingInNeo.slice(0, 10);

    if (missingInPg.length > 0 || missingInNeo.length > 0) {
      failed = true;
    }
  } catch (e: any) {
    return { name: "referential", status: "fail", details: { error: e.message } };
  } finally {
    await session.close();
  }

  return {
    name: "referential",
    status: failed ? "fail" : "pass",
    details,
  };
}
