#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { criticalQueries } from "./critical-queries";
import { DEFAULT_BASELINE_PATH, collectPlanSignature, hashSql } from "./plan-regression";
import { PlanBaseline } from "./types";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const seedFile = path.join(__dirname, "seed.sql");

async function seedDataset(pool: Pool): Promise<void> {
  const sql = await readFile(seedFile, "utf8");
  await pool.query(sql);
}

async function refreshBaseline(): Promise<void> {
  const connectionString = process.env.PLAN_REGRESSION_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "PLAN_REGRESSION_DATABASE_URL or DATABASE_URL must be set to refresh the plan baseline"
    );
  }

  const stage = process.env.PLAN_REGRESSION_ENV || process.env.NODE_ENV || "development";
  if (["prod", "production"].includes(stage.toLowerCase())) {
    throw new Error("Refusing to update plan baselines against production");
  }

  const analyze = process.env.PLAN_REGRESSION_ANALYZE === "true";
  const shouldSeed =
    process.env.PLAN_REGRESSION_SKIP_SEED !== "true" &&
    process.env.PLAN_REGRESSION_SKIP_SEED !== "1";

  const pool = new Pool({ connectionString });

  try {
    if (shouldSeed) {
      await seedDataset(pool);
    }

    const queries = await Promise.all(
      criticalQueries.map(async (query) => {
        const explainPrefix = analyze
          ? "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)"
          : "EXPLAIN (FORMAT JSON)";
        const { rows } = await pool.query(`${explainPrefix} ${query.sql}`);
        const signature = collectPlanSignature(rows[0]["QUERY PLAN"]);

        return {
          id: query.id,
          description: query.description,
          sql: query.sql.replace(/\s+/g, " ").trim(),
          sqlHash: hashSql(query.sql),
          signature,
        };
      })
    );

    const baseline: PlanBaseline = {
      generatedAt: new Date().toISOString(),
      analyze,
      queries,
    };

    await writeFile(DEFAULT_BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    // eslint-disable-next-line no-console
    console.log(`✅ Updated ${DEFAULT_BASELINE_PATH} with ${queries.length} query plans`);
  } finally {
    await pool.end();
  }
}

refreshBaseline().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to refresh plan regression baseline", error);
  process.exitCode = 1;
});
