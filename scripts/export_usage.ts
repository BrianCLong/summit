#!/usr/bin/env node
import { getPool } from '../server/db/connect.js';
import fs from 'fs';

async function exportUsage() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Get last month's data
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const yearMonth = lastMonth.toISOString().slice(0, 7); // YYYY-MM
    
    console.log(`Exporting usage data for ${yearMonth}...`);
    
    const result = await client.query(`
      SELECT 
        t.name as tenant_name,
        t.plan,
        qu.tenant_id,
        qu.key,
        qu.period,
        qu.used,
        qd.${t.plan} as quota_limit
      FROM quota_usage qu
      JOIN tenants t ON qu.tenant_id = t.id
      LEFT JOIN quota_def qd ON qu.key = qd.key
      WHERE qu.period >= $1 AND qu.period < $2
      ORDER BY qu.tenant_id, qu.period, qu.key
    `, [`${yearMonth}-01`, `${yearMonth}-32`]);
    
    // Generate CSV
    const header = 'tenant_name,tenant_id,plan,quota_key,period,used,quota_limit\n';
    const rows = result.rows.map(row => 
      `${row.tenant_name},${row.tenant_id},${row.plan},${row.key},${row.period},${row.used},${row.quota_limit || ''}`
    ).join('\n');
    
    const csv = header + rows;
    
    // Write to stdout (captured by GitHub Actions)
    console.log(csv);
    
    // Also write to file for local use
    const filename = `usage-export-${yearMonth}.csv`;
    fs.writeFileSync(filename, csv);
    console.error(`Usage export written to ${filename} (${result.rows.length} records)`);
    
  } catch (error) {
    console.error('Failed to export usage:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  exportUsage().catch(console.error);
}