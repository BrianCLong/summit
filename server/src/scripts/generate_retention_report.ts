import { getPostgresPool } from '../config/database.js';
import { logger } from '../config/logger.js';
import fs from 'fs';
import path from 'path';

async function generateReport() {
  const pool = getPostgresPool();

  try {
    // Check if audit_logs table exists first
    const tableCheck = await pool.query("SELECT to_regclass('public.audit_logs')");
    if (!tableCheck.rows[0].to_regclass) {
      logger.warn('audit_logs table does not exist, skipping report generation');
      return;
    }

    const res = await pool.query(
      `SELECT * FROM audit_logs
       WHERE action LIKE '%_DELETED_TTL'
       AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC`
    );

    const report = {
      generatedAt: new Date(),
      period: '30 days',
      retentionActions: res.rows
    };

    const outputPath = 'artifacts/compliance/retention-audit.json';
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    logger.info(`Retention audit report generated at ${outputPath}`);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  } finally {
    // Don't close pool if it disrupts other things, but this is a script
    // await pool.end(); // getPostgresPool might return a shared pool?
    // Usually scripts should close connection.
    // Checking database.ts might be wise but for a script it's fine.
    process.exit(0);
  }
}

generateReport();
