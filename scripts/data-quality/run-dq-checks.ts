/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import pg from "pg";
import neo4j from "neo4j-driver";
import { fileURLToPath } from "node:url";

// --- Types ---

interface Rule {
  id: string;
  entity: string;
  type: "schema" | "reference" | "semantic" | "uniqueness";
  severity: "BLOCKER" | "WARN";
  description: string;
  backend: "postgres" | "neo4j";
  query: string;
}

interface RulesConfig {
  rules: Rule[];
}

interface Violation {
  ruleId: string;
  severity: "BLOCKER" | "WARN";
  violationId: string;
  details: any;
}

interface Report {
  timestamp: string;
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    totalViolations: number;
    blockers: number;
    warnings: number;
  };
  results: {
    ruleId: string;
    status: "PASS" | "FAIL" | "ERROR";
    violationCount: number;
    violations: Violation[];
    error?: string;
  }[];
}

// --- Configuration ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

const RULES_FILE = path.join(ROOT_DIR, "data-quality/rules.yml");
const REPORT_JSON = path.join(ROOT_DIR, "reports/dq-report.json");
const REPORT_MD = path.join(ROOT_DIR, "reports/dq-report.md");

// --- Database Connections ---

// We read env vars directly as we are running as a standalone script
const PG_CONFIG = {
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "intelgraph",
};

const NEO4J_CONFIG = {
  uri: process.env.NEO4J_URI || "bolt://localhost:7687",
  user: process.env.NEO4J_USER || "neo4j",
  password: process.env.NEO4J_PASSWORD || "password",
};

// --- Execution ---

async function runPostgresCheck(client: pg.Client, rule: Rule): Promise<Violation[]> {
  const res = await client.query(rule.query);
  return res.rows.map((row) => ({
    ruleId: rule.id,
    severity: rule.severity,
    violationId: row.violation_id,
    details: row.details,
  }));
}

async function runNeo4jCheck(driver: neo4j.Driver, rule: Rule): Promise<Violation[]> {
  const session = driver.session();
  try {
    const result = await session.run(rule.query);
    return result.records.map((record) => {
      const vId = record.get("violation_id");
      const violationId =
        typeof vId === "object" && vId && vId.toString ? vId.toString() : String(vId);

      return {
        ruleId: rule.id,
        severity: rule.severity,
        violationId: violationId,
        details: record.get("details"),
      };
    });
  } finally {
    await session.close();
  }
}

async function main() {
  console.log("Starting Data Quality Checks...");

  // 1. Load Rules
  if (!fs.existsSync(RULES_FILE)) {
    console.error(`Rules file not found at ${RULES_FILE}`);
    process.exit(1);
  }
  const rulesConfig = yaml.load(fs.readFileSync(RULES_FILE, "utf8")) as RulesConfig;
  const rules = rulesConfig.rules;
  console.log(`Loaded ${rules.length} rules.`);

  // 2. Connect to DBs
  let pgClient: pg.Client | null = null;
  let neo4jDriver: neo4j.Driver | null = null;

  const hasPgRules = rules.some((r) => r.backend === "postgres");
  const hasNeo4jRules = rules.some((r) => r.backend === "neo4j");

  if (hasPgRules) {
    console.log("Connecting to PostgreSQL...");
    try {
      const client = new pg.Client(PG_CONFIG);
      await client.connect();
      pgClient = client;
      console.log("✅ PostgreSQL connected.");
    } catch (e: any) {
      console.error("Failed to connect to Postgres:", e.message || e);
      pgClient = null;
    }
  }

  if (hasNeo4jRules) {
    console.log("Connecting to Neo4j...");
    try {
      const driver = neo4j.driver(
        NEO4J_CONFIG.uri,
        neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
      );
      await driver.verifyConnectivity();
      neo4jDriver = driver;
      console.log("✅ Neo4j connected.");
    } catch (e: any) {
      console.error("Failed to connect to Neo4j:", e.message || e);
      neo4jDriver = null;
    }
  }

  // 3. Execute Rules
  const report: Report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRules: rules.length,
      passedRules: 0,
      failedRules: 0,
      totalViolations: 0,
      blockers: 0,
      warnings: 0,
    },
    results: [],
  };

  for (const rule of rules) {
    console.log(`Running rule ${rule.id} (${rule.entity})...`);
    let violations: Violation[] = [];
    let error: string | undefined;

    try {
      if (rule.backend === "postgres") {
        if (!pgClient) {
          throw new Error("PostgreSQL connection not available");
        }
        violations = await runPostgresCheck(pgClient, rule);
      } else if (rule.backend === "neo4j") {
        if (!neo4jDriver) {
          throw new Error("Neo4j connection not available");
        }
        violations = await runNeo4jCheck(neo4jDriver, rule);
      } else {
        throw new Error(`Unknown backend: ${(rule as any).backend}`);
      }
    } catch (err: any) {
      error = err.message || String(err);
      console.error(`Error on rule ${rule.id}: ${error}`);
    }

    const failed = violations.length > 0;

    // Determine status
    let status: "PASS" | "FAIL" | "ERROR";
    if (error) {
      status = "ERROR";
    } else if (failed) {
      status = "FAIL";
    } else {
      status = "PASS";
    }

    report.results.push({
      ruleId: rule.id,
      status,
      violationCount: violations.length,
      violations: violations,
      error,
    });

    if (error) {
      report.summary.failedRules++;
    } else if (failed) {
      report.summary.failedRules++;
      report.summary.totalViolations += violations.length;
      if (rule.severity === "BLOCKER") {
        report.summary.blockers += violations.length;
      }
      if (rule.severity === "WARN") {
        report.summary.warnings += violations.length;
      }
    } else {
      report.summary.passedRules++;
    }
  }

  // 4. Cleanup
  if (pgClient) {
    try {
      await pgClient.end();
    } catch (e) {
      console.error("Error closing PG:", e);
    }
  }
  if (neo4jDriver) {
    try {
      await neo4jDriver.close();
    } catch (e) {
      console.error("Error closing Neo4j:", e);
    }
  }

  // 5. Generate Reports
  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));

  // Generate MD
  let md = `# Data Quality Report\n`;
  md += `**Timestamp**: ${report.timestamp}\n\n`;
  md += `## Summary\n`;
  md += `- **Total Rules**: ${report.summary.totalRules}\n`;
  md += `- **Passed**: ${report.summary.passedRules}\n`;
  md += `- **Failed**: ${report.summary.failedRules}\n`;
  md += `- **Total Violations**: ${report.summary.totalViolations}\n`;
  md += `  - **BLOCKER**: ${report.summary.blockers}\n`;
  md += `  - **WARN**: ${report.summary.warnings}\n\n`;

  if (report.summary.failedRules > 0) {
    md += `## Violations\n`;
    for (const res of report.results) {
      if (res.status !== "PASS") {
        const rule = rules.find((r) => r.id === res.ruleId);
        md += `### ${res.ruleId} (${rule?.severity}): ${rule?.description}\n`;
        if (res.error) {
          md += `> **Error**: ${res.error}\n\n`;
        } else {
          md += `Found ${res.violationCount} violations.\n`;
          md += `| Violation ID | Details |\n`;
          md += `|---|---|\n`;
          res.violations.slice(0, 10).forEach((v) => {
            const detailStr = JSON.stringify(v.details);
            const escapedDetail = detailStr.replace(/\|/g, "\\|");
            md += `| ${v.violationId} | ${escapedDetail} |\n`;
          });
          if (res.violations.length > 10) {
            md += `| ... | ... |\n`;
          }
          md += `\n`;
        }
      }
    }
  } else {
    md += `✅ All checks passed!\n`;
  }

  fs.writeFileSync(REPORT_MD, md);
  console.log(`Reports generated at ${REPORT_JSON} and ${REPORT_MD}`);

  // 6. Exit Code
  if (report.summary.blockers > 0) {
    console.error("❌ Blocking violations found!");
    process.exit(1);
  } else {
    console.log("✅ No blocking violations.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Unhandled fatal error:", err);
  process.exit(1);
});
