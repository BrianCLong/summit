import { config } from "dotenv";
import { Pool, PoolClient } from "pg";

config();

type Mode = "anonymize" | "delete";

interface SubjectIdentifier {
  userId?: string;
  email?: string;
  mode: Mode;
  dryRun: boolean;
}

interface OperationResult {
  userFound: boolean;
  anonymized?: number;
  deletedUsers?: number;
  removedRoles?: number;
  removedImpersonations?: number;
  redactedAuditLogs?: number;
}

function parseArgs(): SubjectIdentifier {
  const args = process.argv.slice(2);
  let userId: string | undefined;
  let email: string | undefined;
  let mode: Mode = "anonymize";
  let dryRun = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === "--user-id" && next) {
      userId = next;
      i += 1;
    } else if (arg === "--email" && next) {
      email = next;
      i += 1;
    } else if (arg === "--mode" && next) {
      if (next !== "anonymize" && next !== "delete") {
        throw new Error("Mode must be anonymize or delete");
      }
      mode = next;
      i += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  if (!userId && !email) {
    throw new Error("Provide --user-id or --email");
  }

  return { userId, email, mode, dryRun };
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

async function resolveUserId(pool: Pool, identifier: SubjectIdentifier): Promise<string | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id FROM users WHERE ($1::uuid IS NOT NULL AND id = $1::uuid)
        OR ($2::text IS NOT NULL AND lower(email) = lower($2::text))
        LIMIT 1`,
      [identifier.userId ?? null, identifier.email ?? null]
    );
    return (result.rows[0]?.id as string | undefined) ?? null;
  } finally {
    client.release();
  }
}

async function countRows(client: PoolClient, query: string, params: unknown[]): Promise<number> {
  const { rows } = await client.query(query, params);
  return Number(rows[0]?.count ?? 0);
}

async function anonymizeUser(
  client: PoolClient,
  userId: string,
  dryRun: boolean
): Promise<OperationResult> {
  const placeholderEmail = `deleted+${userId}@example.com`;

  const roleCount = await countRows(
    client,
    "SELECT COUNT(*) AS count FROM user_roles WHERE user_id = $1",
    [userId]
  );
  const impersonationCount = await countRows(
    client,
    "SELECT COUNT(*) AS count FROM user_impersonations WHERE admin_user_id = $1 OR target_user_id = $1",
    [userId]
  );
  const auditCount = await countRows(
    client,
    "SELECT COUNT(*) AS count FROM audit_logs WHERE user_id = $1",
    [userId]
  );

  if (dryRun) {
    return {
      userFound: true,
      anonymized: 0,
      removedRoles: roleCount,
      removedImpersonations: impersonationCount,
      redactedAuditLogs: auditCount,
    };
  }

  await client.query("BEGIN");
  try {
    await client.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
    await client.query(
      "DELETE FROM user_impersonations WHERE admin_user_id = $1 OR target_user_id = $1",
      [userId]
    );
    await client.query(
      `UPDATE audit_logs
         SET user_id = $1,
             ip_address = NULL,
             user_agent = NULL,
             metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('subject_redacted', true)
       WHERE user_id = $2`,
      [userId, userId]
    );

    const userUpdate = await client.query(
      `UPDATE users
         SET email = $1,
             display_name = 'Deleted User',
             username = NULL,
             first_name = NULL,
             last_name = NULL,
             avatar_url = NULL,
             last_login = NULL,
             last_login_ip = NULL,
             password_hash = NULL,
             is_active = false,
             is_suspended = true,
             metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('subject_redacted', true),
             updated_at = now()
       WHERE id = $2`,
      [placeholderEmail, userId]
    );

    await client.query("COMMIT");

    return {
      userFound: true,
      anonymized: userUpdate.rowCount ?? 0,
      removedRoles: roleCount,
      removedImpersonations: impersonationCount,
      redactedAuditLogs: auditCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function deleteUser(
  client: PoolClient,
  userId: string,
  dryRun: boolean
): Promise<OperationResult> {
  const roleCount = await countRows(
    client,
    "SELECT COUNT(*) AS count FROM user_roles WHERE user_id = $1",
    [userId]
  );
  const impersonationCount = await countRows(
    client,
    "SELECT COUNT(*) AS count FROM user_impersonations WHERE admin_user_id = $1 OR target_user_id = $1",
    [userId]
  );
  const auditCount = await countRows(
    client,
    "SELECT COUNT(*) AS count FROM audit_logs WHERE user_id = $1",
    [userId]
  );

  if (dryRun) {
    return {
      userFound: true,
      deletedUsers: 0,
      removedRoles: roleCount,
      removedImpersonations: impersonationCount,
      redactedAuditLogs: auditCount,
    };
  }

  await client.query("BEGIN");
  try {
    await client.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
    await client.query(
      "DELETE FROM user_impersonations WHERE admin_user_id = $1 OR target_user_id = $1",
      [userId]
    );
    await client.query(
      `UPDATE audit_logs
         SET user_id = NULL,
             ip_address = NULL,
             user_agent = NULL,
             metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('subject_deleted', true)
       WHERE user_id = $1`,
      [userId]
    );

    const deleteResult = await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("COMMIT");

    return {
      userFound: true,
      deletedUsers: deleteResult.rowCount ?? 0,
      removedRoles: roleCount,
      removedImpersonations: impersonationCount,
      redactedAuditLogs: auditCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const identifier = parseArgs();
  const pool = buildPool();
  const userId = await resolveUserId(pool, identifier);

  if (!userId) {
    console.error("No matching user found for identifier");
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    const result =
      identifier.mode === "delete"
        ? await deleteUser(client, userId, identifier.dryRun)
        : await anonymizeUser(client, userId, identifier.dryRun);

    if (identifier.dryRun) {
      console.log("[DRY RUN] Planned operations:", JSON.stringify(result, null, 2));
    } else {
      console.log("Completed operations:", JSON.stringify(result, null, 2));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to delete/anonymize subject:", error);
  process.exitCode = 1;
});
