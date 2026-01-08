import { execSync } from "child_process";
import path from "path";
import url from "url";
import neo4j from "neo4j-driver";
import pg from "pg";

type Status = "PASS" | "FAIL" | "WARN";

type Check = {
  name: string;
  run: () => Promise<CheckResult> | CheckResult;
};

type CheckResult = {
  name: string;
  status: Status;
  details?: string;
  fix?: string;
};

const MIN_NODE = "18.18.0";
const MIN_PNPM = "9.12.0";

const color = {
  PASS: "\u001b[32m",
  FAIL: "\u001b[31m",
  WARN: "\u001b[33m",
  reset: "\u001b[0m",
};

function compareVersions(found: string, expected: string) {
  const a = found.replace(/^v/, "").split(".").map(Number);
  const b = expected.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function runCommand(cmd: string) {
  try {
    const output = execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trim();
    return { ok: true, output } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, output: message } as const;
  }
}

const checks: Check[] = [
  {
    name: "Node.js version",
    run: () => {
      const version = process.version;
      const meets = compareVersions(version, MIN_NODE) >= 0;
      return {
        name: "Node.js version",
        status: meets ? "PASS" : "FAIL",
        details: `found ${version}, expected >= ${MIN_NODE}`,
        fix: "Install Node 18+ (use mise or fnm) and rerun `pnpm env use --global 18`.",
      };
    },
  },
  {
    name: "pnpm version",
    run: () => {
      const result = runCommand("pnpm --version");
      if (!result.ok) {
        return {
          name: "pnpm version",
          status: "FAIL",
          details: result.output,
          fix: "Install pnpm 9+ (corepack enable && pnpm env use --global 9.12.0).",
        };
      }
      const meets = compareVersions(result.output, MIN_PNPM) >= 0;
      return {
        name: "pnpm version",
        status: meets ? "PASS" : "FAIL",
        details: `found ${result.output}, expected >= ${MIN_PNPM}`,
        fix: "Run `corepack enable && pnpm env use --global 9.12.0`.",
      };
    },
  },
  {
    name: "Docker daemon",
    run: () => {
      const result = runCommand('docker info --format "{{.ServerVersion}}"');
      if (!result.ok) {
        return {
          name: "Docker daemon",
          status: "FAIL",
          details: result.output,
          fix: "Start Docker Desktop/daemon and ensure your user is in the docker group.",
        };
      }
      return {
        name: "Docker daemon",
        status: "PASS",
        details: `server ${result.output}`,
      };
    },
  },
  {
    name: "Docker Compose",
    run: () => {
      const result = runCommand("docker compose version --short");
      if (!result.ok) {
        return {
          name: "Docker Compose",
          status: "FAIL",
          details: result.output,
          fix: "Upgrade to Docker Compose v2 (bundled with Docker Desktop) and retry.",
        };
      }
      return {
        name: "Docker Compose",
        status: "PASS",
        details: result.output,
      };
    },
  },
  {
    name: "Postgres connectivity",
    run: async () => {
      const connectionString =
        process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/intelgraph";
      const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
      try {
        await client.connect();
        const res = await client.query("select 1 as ok");
        const value = res.rows[0]?.ok ?? "unknown";
        return {
          name: "Postgres connectivity",
          status: value === 1 ? "PASS" : "WARN",
          details: `connected via ${connectionString}`,
          fix: "Start docker compose services and ensure DATABASE_URL points to the dev Postgres instance.",
        };
      } catch (error) {
        return {
          name: "Postgres connectivity",
          status: "FAIL",
          details: error instanceof Error ? error.message : String(error),
          fix: "Run `docker compose up -d postgres` (or `pnpm dev`), then rerun the check.",
        };
      } finally {
        await client.end().catch(() => undefined);
      }
    },
  },
  {
    name: "Neo4j connectivity",
    run: async () => {
      const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
      const user = process.env.NEO4J_USER ?? "neo4j";
      const password = process.env.NEO4J_PASSWORD ?? "devpassword";
      const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        connectionTimeout: 5000,
      });
      try {
        const session = driver.session();
        await session.run("RETURN 1");
        await session.close();
        await driver.close();
        return {
          name: "Neo4j connectivity",
          status: "PASS",
          details: `connected to ${uri} as ${user}`,
        };
      } catch (error) {
        await driver.close();
        return {
          name: "Neo4j connectivity",
          status: "FAIL",
          details: error instanceof Error ? error.message : String(error),
          fix: "Ensure Neo4j is running (docker compose up) and credentials match NEO4J_USER/NEO4J_PASSWORD.",
        };
      }
    },
  },
  {
    name: "Golden path smoke tests",
    run: () => {
      const result = runCommand("pnpm smoke");
      return {
        name: "Golden path smoke tests",
        status: result.ok ? "PASS" : "FAIL",
        details: result.output,
        fix: "Start services (`pnpm dev` or `docker compose -f docker-compose.dev.yml up`), then rerun smoke tests.",
      };
    },
  },
  {
    name: "Lint + typecheck",
    run: () => {
      const lint = runCommand("pnpm lint");
      const typecheck = runCommand("pnpm typecheck");
      if (!lint.ok) {
        return {
          name: "Lint + typecheck",
          status: "FAIL",
          details: lint.output,
          fix: "Run `pnpm lint` locally, address ESLint errors, and ensure dependencies are installed.",
        };
      }
      if (!typecheck.ok) {
        return {
          name: "Lint + typecheck",
          status: "FAIL",
          details: typecheck.output,
          fix: "Run `pnpm typecheck` and resolve TypeScript errors. Ensure tsconfig paths are up to date.",
        };
      }
      return { name: "Lint + typecheck", status: "PASS", details: "clean" };
    },
  },
];

async function main() {
  const results: CheckResult[] = [];
  for (const check of checks) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await check.run();
      results.push(result);
    } catch (error) {
      results.push({
        name: check.name,
        status: "FAIL",
        details: error instanceof Error ? error.message : String(error),
        fix: "Re-run with --verbose logging and check your local environment.",
      });
    }
  }

  const summary = results.reduce(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { PASS: 0, FAIL: 0, WARN: 0 } as Record<Status, number>
  );

  const root = path.dirname(url.fileURLToPath(import.meta.url));
  const reportLines = [
    "Bootcamp Check Report",
    `Working dir: ${root}`,
    "",
    ...results.map((result) => {
      const statusColor = color[result.status];
      const base = `${statusColor}${result.status}${color.reset}`;
      const lines = [`- ${base} ${result.name}`];
      if (result.details) lines.push(`  details: ${result.details}`);
      if (result.fix && result.status !== "PASS") lines.push(`  fix: ${result.fix}`);
      return lines.join("\n");
    }),
    "",
    `Summary → PASS: ${summary.PASS}, WARN: ${summary.WARN}, FAIL: ${summary.FAIL}`,
  ];

  console.log(reportLines.join("\n"));

  const hasFailures = results.some((r) => r.status === "FAIL");
  if (hasFailures) {
    process.exitCode = 1;
  }
}

main();
