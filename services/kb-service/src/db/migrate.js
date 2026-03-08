"use strict";
/**
 * Database Migration Runner
 * Applies schema to PostgreSQL database
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const connection_js_1 = require("./connection.js");
const __dirname = (0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url));
async function migrate() {
    console.log('Starting KB database migration...');
    const pool = (0, connection_js_1.getPool)();
    try {
        // Read schema file
        const schemaPath = (0, path_1.join)(__dirname, 'schema.sql');
        const schema = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
        // Execute schema
        await pool.query(schema);
        console.log('KB database migration completed successfully.');
    }
    catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
    finally {
        await (0, connection_js_1.closePool)();
    }
}
// Run if executed directly
migrate().catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
});
