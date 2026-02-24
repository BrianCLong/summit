import { CheckResult } from "../lib/types";
import { getPgPool } from "../lib/pg";
import { getNeo4jDriver } from "../lib/neo4j";

export interface CountMapping {
  table: string;
  label: string;
}

export async function countsCheck(mappings: CountMapping[]): Promise<CheckResult> {
  const details: Record<string, any> = {};
  let failed = false;

  const pg = getPgPool();
  const neo4j = getNeo4jDriver();
  const session = neo4j.session();

  try {
    for (const m of mappings) {
      const pgRes = await pg.query(`SELECT count(*) as c FROM ${m.table}`);
      const pgCount = parseInt(pgRes.rows[0].c, 10);

      const neoRes = await session.run(`MATCH (n:${m.label}) RETURN count(n) as c`);
      const neoCount = neoRes.records[0].get("c").toNumber();

      details[`${m.table} vs ${m.label}`] = { pg: pgCount, neo4j: neoCount };

      if (pgCount !== neoCount) {
        failed = true;
      }
    }
  } catch (e: any) {
    return { name: "counts", status: "fail", details: { error: e.message } };
  } finally {
    await session.close();
  }

  return {
    name: "counts",
    status: failed ? "fail" : "pass",
    details,
  };
}
