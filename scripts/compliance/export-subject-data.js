"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const url_1 = require("url");
(0, dotenv_1.config)();
function parseArgs() {
    const args = process.argv.slice(2);
    const identifier = {};
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        const next = args[i + 1];
        if (arg === '--user-id' && next) {
            identifier.userId = next;
            i += 1;
        }
        else if (arg === '--email' && next) {
            identifier.email = next;
            i += 1;
        }
        else if (arg === '--output' && next) {
            identifier.output = next;
            i += 1;
        }
    }
    if (!identifier.userId && !identifier.email) {
        throw new Error('Provide --user-id or --email');
    }
    return identifier;
}
function buildPool() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
        return new pg_1.Pool({
            connectionString,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        });
    }
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST || !DB_USER || !DB_NAME) {
        throw new Error('Set DATABASE_URL or DB_HOST/DB_USER/DB_NAME for PostgreSQL access');
    }
    return new pg_1.Pool({
        host: DB_HOST,
        port: DB_PORT ? Number(DB_PORT) : 5432,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
}
async function loadSubject(pool, identifier) {
    const client = await pool.connect();
    try {
        const userResult = await client.query(`SELECT * FROM users WHERE ($1::uuid IS NOT NULL AND id = $1::uuid)
        OR ($2::text IS NOT NULL AND lower(email) = lower($2::text))
        LIMIT 1`, [identifier.userId ?? null, identifier.email ?? null]);
        const subject = userResult.rows[0] ?? null;
        const subjectId = subject?.id;
        const roles = subjectId
            ? (await client.query(`SELECT ur.user_id, ur.role_id, r.name AS role_name, ur.granted_at
             FROM user_roles ur
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = $1`, [subjectId])).rows
            : [];
        const impersonations = subjectId
            ? (await client.query(`SELECT * FROM user_impersonations
             WHERE admin_user_id = $1 OR target_user_id = $1
             ORDER BY started_at DESC`, [subjectId])).rows
            : [];
        const auditLogs = subjectId
            ? (await client.query(`SELECT * FROM audit_logs
             WHERE user_id = $1
             ORDER BY timestamp DESC
             LIMIT 5000`, [subjectId])).rows
            : [];
        return { subject, roles, impersonations, auditLogs };
    }
    finally {
        client.release();
    }
}
function buildOutputPath(identifier) {
    if (identifier.output) {
        return path_1.default.resolve(process.cwd(), identifier.output);
    }
    const fallbackName = identifier.userId ?? identifier.email ?? 'subject';
    const safeName = fallbackName.replace(/[^a-zA-Z0-9-_]+/g, '-');
    const filename = `subject-${safeName}-${Date.now()}.json`;
    const __filename = (0, url_1.fileURLToPath)(import.meta.url);
    const __dirname = path_1.default.dirname(__filename);
    return path_1.default.resolve(__dirname, 'exports', filename);
}
async function main() {
    const identifier = parseArgs();
    const pool = buildPool();
    const exportData = await loadSubject(pool, identifier);
    const payload = {
        ...exportData,
        generatedAt: new Date().toISOString(),
    };
    const outputPath = buildOutputPath(identifier);
    await promises_1.default.mkdir(path_1.default.dirname(outputPath), { recursive: true });
    await promises_1.default.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`Export complete: ${outputPath}`);
    await pool.end();
}
main().catch((error) => {
    console.error('Failed to export subject data:', error);
    process.exitCode = 1;
});
