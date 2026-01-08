import { config } from "dotenv";
import fs from "fs/promises";
import path from "path";
import { Pool } from "pg";
import { fileURLToPath } from "url";

config();

interface SubjectIdentifier {
  userId?: string;
  email?: string;
  output?: string;
}

interface SubjectExport {
  subject: Record<string, unknown> | null;
  roles: Record<string, unknown>[];
  impersonations: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  generatedAt: string;
}

function parseArgs(): SubjectIdentifier {
  const args = process.argv.slice(2);
  const identifier: SubjectIdentifier = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === "--user-id" && next) {
      identifier.userId = next;
      i += 1;
    } else if (arg === "--email" && next) {
      identifier.email = next;
      i += 1;
    } else if (arg === "--output" && next) {
      identifier.output = next;
      i += 1;
    }
  }

  if (!identifier.userId && !identifier.email) {
    throw new Error("Provide --user-id or --email");
  }

  return identifier;
}

function buildPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error("Set DATABASE_URL or DB_HOST/DB_USER/DB_NAME for PostgreSQL access");
  }

  return new Pool({
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 5432,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

async function loadSubject(pool: Pool, identifier: SubjectIdentifier) {
  const client = await pool.connect();
  try {
    const userResult = await client.query(
      `SELECT * FROM users WHERE ($1::uuid IS NOT NULL AND id = $1::uuid)
        OR ($2::text IS NOT NULL AND lower(email) = lower($2::text))
        LIMIT 1`,
      [identifier.userId ?? null, identifier.email ?? null]
    );
    const subject = userResult.rows[0] ?? null;
    const subjectId = subject?.id as string | undefined;

    const roles = subjectId
      ? (
          await client.query(
            `SELECT ur.user_id, ur.role_id, r.name AS role_name, ur.granted_at
             FROM user_roles ur
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = $1`,
            [subjectId]
          )
        ).rows
      : [];

    const impersonations = subjectId
      ? (
          await client.query(
            `SELECT * FROM user_impersonations
             WHERE admin_user_id = $1 OR target_user_id = $1
             ORDER BY started_at DESC`,
            [subjectId]
          )
        ).rows
      : [];

    const auditLogs = subjectId
      ? (
          await client.query(
            `SELECT * FROM audit_logs
             WHERE user_id = $1
             ORDER BY timestamp DESC
             LIMIT 5000`,
            [subjectId]
          )
        ).rows
      : [];

    return { subject, roles, impersonations, auditLogs } satisfies Omit<
      SubjectExport,
      "generatedAt"
    >;
  } finally {
    client.release();
  }
}

function buildOutputPath(identifier: SubjectIdentifier): string {
  if (identifier.output) {
    return path.resolve(process.cwd(), identifier.output);
  }

  const fallbackName = identifier.userId ?? identifier.email ?? "subject";
  const safeName = fallbackName.replace(/[^a-zA-Z0-9-_]+/g, "-");
  const filename = `subject-${safeName}-${Date.now()}.json`;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "exports", filename);
}

async function main() {
  const identifier = parseArgs();
  const pool = buildPool();

  const exportData = await loadSubject(pool, identifier);
  const payload: SubjectExport = {
    ...exportData,
    generatedAt: new Date().toISOString(),
  };

  const outputPath = buildOutputPath(identifier);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`Export complete: ${outputPath}`);
  await pool.end();
}

main().catch((error) => {
  console.error("Failed to export subject data:", error);
  process.exitCode = 1;
});
