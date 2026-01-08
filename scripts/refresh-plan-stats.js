/* eslint-disable no-console */
const { Pool } = require("pg");

async function refreshStatistics() {
  const env =
    process.env.PLAN_REGRESSION_ENV ||
    process.env.DEPLOY_ENV ||
    process.env.NODE_ENV ||
    "development";

  const lowered = env.toLowerCase();
  if (!["staging", "stage", "test", "testing", "ci"].includes(lowered)) {
    throw new Error(
      `Refusing to run ANALYZE in ${env}; set PLAN_REGRESSION_ENV=staging or test to proceed`
    );
  }

  const connectionString = process.env.PLAN_REGRESSION_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "PLAN_REGRESSION_DATABASE_URL or DATABASE_URL must be set to refresh statistics"
    );
  }

  const tables = process.env.PLAN_REGRESSION_ANALYZE_TABLES?.split(",")
    .map((table) => table.trim())
    .filter(Boolean) ?? [
    "plan_regression.investigations",
    "plan_regression.activity_log",
    "plan_regression.entities",
  ];

  const analyzeVerbosity = process.env.PLAN_REGRESSION_ANALYZE_VERBOSE === "true";

  const pool = new Pool({ connectionString });
  try {
    await pool.query("SET search_path TO plan_regression, public;");
    for (const table of tables) {
      const statement = analyzeVerbosity ? `ANALYZE VERBOSE ${table};` : `ANALYZE ${table};`;
      await pool.query(statement);
      console.log(`Refreshed planner statistics for ${table}`);
    }
  } finally {
    await pool.end();
  }
}

refreshStatistics().catch((error) => {
  console.error("Failed to refresh Postgres statistics", error);
  process.exitCode = 1;
});
