"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_js_1 = require("../config/database.js");
const logger_js_1 = require("../config/logger.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function generateReport() {
    const pool = (0, database_js_1.getPostgresPool)();
    try {
        // Check if audit_logs table exists first
        const tableCheck = await pool.query("SELECT to_regclass('public.audit_logs')");
        if (!tableCheck.rows[0].to_regclass) {
            logger_js_1.logger.warn('audit_logs table does not exist, skipping report generation');
            return;
        }
        const res = await pool.query(`SELECT * FROM audit_logs
       WHERE action LIKE '%_DELETED_TTL'
       AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC`);
        const report = {
            generatedAt: new Date(),
            period: '30 days',
            retentionActions: res.rows
        };
        const outputPath = 'artifacts/compliance/retention-audit.json';
        const dir = path_1.default.dirname(outputPath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        logger_js_1.logger.info(`Retention audit report generated at ${outputPath}`);
    }
    catch (error) {
        logger_js_1.logger.error(error);
        process.exit(1);
    }
    finally {
        // Don't close pool if it disrupts other things, but this is a script
        // await pool.end(); // getPostgresPool might return a shared pool?
        // Usually scripts should close connection.
        // Checking database.ts might be wise but for a script it's fine.
        process.exit(0);
    }
}
generateReport();
