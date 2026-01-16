import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { main } from "../src/validate-events.js";

const tmp = join(process.cwd(), "dist", "tests-tmp");
mkdirSync(tmp, { recursive: true });

test("validator blocks non-allowlisted outputs deterministically", () => {
  const eventsPath = join(tmp, "events.json");
  // Fix schema path to be relative to repo root, assuming process.cwd() is the package dir when running via npm script
  // But wait, the previous error showed process.cwd() as /app/packages/lineage-extractors/postgres
  // And the file is at /app/schemas/lineage/openlineage.postgres.extension.schema.json
  // So we need to go up 3 levels.
  const schemaPath = resolve(process.cwd(), "../../../schemas/lineage/openlineage.postgres.extension.schema.json");
  const policyPath = resolve(process.cwd(), "../../../docs/governance/LINEAGE_POLICY.yml");
  const reportPath = join(tmp, "report.json");

  // output: sensitive.secret_table should be BLOCK by default policy above
  const events = [
    {
      eventType: "OTHER",
      eventTime: "1970-01-01T00:00:00.000Z",
      producer: "summit-lineage-extractor-postgres",
      schemaURL: "https://openlineage.io/spec/1-0-0/OpenLineage.json",
      job: { namespace: "summit", name: "t" },
      run: {
        runId: "b".repeat(64),
        facets: {
          "summit.audit": { actor: "ci", sourceSha: "0123456789abcdef0", policyHash: "a".repeat(64) },
          "summit.governanceVerdict": { verdict: "ALLOW", reasons: [] },
          "summit.postgres": { sqlHash: "b".repeat(64), dialect: "postgres", notes: [] }
        }
      },
      inputs: [{ namespace: "public", name: "t" }],
      outputs: [{ namespace: "sensitive", name: "secret_table" }]
    }
  ];
  writeFileSync(eventsPath, JSON.stringify(events), "utf8");

  const code = main([
    "--events",
    eventsPath,
    "--schema",
    schemaPath,
    "--policy",
    policyPath,
    "--report",
    reportPath
  ]);

  assert.equal(code, 3);
});
