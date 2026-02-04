#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";
import neo4j from "neo4j-driver";

const runId = process.env.RUN_ID;
const pgUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USER;
const neo4jPassword = process.env.NEO4J_PASSWORD;
const outputPath = process.env.EVIDENCE_DELTA_PATH || "evidence_delta.json";

if (!runId) {
  console.error("RUN_ID is required.");
  process.exit(1);
}
if (!pgUrl) {
  console.error("POSTGRES_URL or DATABASE_URL is required.");
  process.exit(1);
}
if (!neo4jUri || !neo4jUser || !neo4jPassword) {
  console.error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD are required.");
  process.exit(1);
}

const { Client } = pg;

const pgClient = new Client({ connectionString: pgUrl });

const pgRowQuery = `
  SELECT
    id,
    encode(digest(concat_ws('||',
      id::text,
      coalesce(payload::text,''),
      coalesce(metadata::text,'')
    ), 'sha256'), 'hex') AS row_digest
  FROM public.evidence
  WHERE run_id = $1
  ORDER BY id;
`;

const pgAggregateQuery = `
  WITH rows AS (
    SELECT id,
           encode(digest(concat_ws('||',
             id::text,
             coalesce(payload::text,''),
             coalesce(metadata::text,'')
           ), 'sha256'), 'hex') AS row_digest
    FROM public.evidence
    WHERE run_id = $1
  )
  SELECT encode(digest(string_agg(row_digest, '' ORDER BY id), 'sha256'), 'hex')
         AS run_aggregate_digest
  FROM rows;
`;

const evidenceDelta = {
  runId,
  pgAggregateDigest: null,
  neo4jAggregateDigest: null,
  missingInPostgres: [],
  missingInNeo4j: [],
  digestMismatch: [],
};

const computeAggregate = (digests) =>
  crypto.createHash("sha256").update(digests.join(""), "utf8").digest("hex");

const main = async () => {
  await pgClient.connect();

  const pgRows = await pgClient.query(pgRowQuery, [runId]);
  const pgAggregate = await pgClient.query(pgAggregateQuery, [runId]);
  const pgAggregateDigest = pgAggregate.rows[0]?.run_aggregate_digest || null;

  const pgMap = new Map(
    pgRows.rows.map((row) => [String(row.id), String(row.row_digest)])
  );

  evidenceDelta.pgAggregateDigest =
    pgAggregateDigest ?? computeAggregate([...pgMap.values()]);

  await pgClient.end();

  const driver = neo4j.driver(
    neo4jUri,
    neo4j.auth.basic(neo4jUser, neo4jPassword)
  );
  const session = driver.session();

  const cypher = `
    MATCH (r:Run {runId:$runId})-[:EMITS]->(e:Evidence)
    RETURN e.id AS id, e.digest AS digest
  `;

  const neo4jResult = await session.run(cypher, { runId });

  const neo4jRows = neo4jResult.records.map((record) => ({
    id: record.get("id"),
    digest: record.get("digest"),
  }));

  const hasIds = neo4jRows.every((row) => row.id !== null && row.id !== undefined);
  const sortedNeo4j = [...neo4jRows].sort((a, b) => {
    const left = hasIds ? String(a.id) : String(a.digest || "");
    const right = hasIds ? String(b.id) : String(b.digest || "");
    return left.localeCompare(right);
  });

  const neo4jDigests = sortedNeo4j.map((row) => String(row.digest || ""));
  evidenceDelta.neo4jAggregateDigest = computeAggregate(neo4jDigests);

  const neo4jMap = new Map(
    neo4jRows
      .filter((row) => row.id !== null && row.id !== undefined)
      .map((row) => [String(row.id), String(row.digest || "")])
  );

  for (const [id, digest] of pgMap.entries()) {
    if (!neo4jMap.has(id)) {
      evidenceDelta.missingInNeo4j.push({ id, digest });
      continue;
    }
    const neo4jDigest = neo4jMap.get(id);
    if (neo4jDigest !== digest) {
      evidenceDelta.digestMismatch.push({
        id,
        postgresDigest: digest,
        neo4jDigest,
      });
    }
  }

  for (const [id, digest] of neo4jMap.entries()) {
    if (!pgMap.has(id)) {
      evidenceDelta.missingInPostgres.push({ id, digest });
    }
  }

  await session.close();
  await driver.close();

  if (
    evidenceDelta.pgAggregateDigest !== evidenceDelta.neo4jAggregateDigest ||
    evidenceDelta.missingInNeo4j.length > 0 ||
    evidenceDelta.missingInPostgres.length > 0 ||
    evidenceDelta.digestMismatch.length > 0
  ) {
    const fs = await import("node:fs");
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(evidenceDelta, null, 2)
    );
    console.error(
      `Run integrity mismatch. See ${outputPath} for details.`
    );
    process.exit(1);
  }

  console.log(
    `Run integrity OK. Digest: ${evidenceDelta.pgAggregateDigest ?? "n/a"}`
  );
};

main().catch(async (error) => {
  const fs = await import("node:fs");
  evidenceDelta.error = error?.message || String(error);
  await fs.promises.writeFile(outputPath, JSON.stringify(evidenceDelta, null, 2));
  console.error(error);
  process.exit(1);
});
