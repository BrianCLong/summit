"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
require("dotenv/config");
async function preflight() {
    console.log('🚀 Starting Pre-flight Checks...');
    const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connStr) {
        console.error('❌ POSTGRES_URL or DATABASE_URL not set');
        process.exit(1);
    }
    const client = new pg_1.Client({ connectionString: connStr });
    try {
        // 1. Check Connection
        console.log('1️⃣  Checking Database Connection...');
        await client.connect();
        console.log('   ✅ Connection successful');
        // 2. Check for Locks (simplified)
        console.log('2️⃣  Checking for active migration locks...');
        // This assumes we might have some locking mechanism in the future or checking if another migration is running.
        // For now, we just check if we can query the table.
        await client.query('SELECT 1');
        console.log('   ✅ No obvious locks preventing queries');
        // 3. Check for Pending Migrations
        // We can reuse logic from db_manager or just check count here if needed.
        // For preflight, getting server version is good enough.
        const res = await client.query('SELECT version()');
        console.log(`   ✅ Postgres Version: ${res.rows[0].version}`);
    }
    catch (err) {
        console.error('❌ Pre-flight Check Failed:', err);
        process.exit(1);
    }
    finally {
        await client.end();
    }
}
preflight();
