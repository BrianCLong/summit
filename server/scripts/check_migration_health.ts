import { Client } from 'pg';
import 'dotenv/config';
import http from 'http';

const PORT = parseInt(process.env.MIGRATION_HEALTH_PORT || '4001', 10);

async function checkMigrationHealth() {
  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) return { status: 'error', message: 'No connection string' };

  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    // Check if we can query the migrations table
    const res = await client.query('SELECT count(*) FROM _migrations');
    return { status: 'ok', applied_count: parseInt(res.rows[0].count, 10) };
  } catch (err: any) {
    return { status: 'error', message: err.message };
  } finally {
    await client.end();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/metrics') {
    const health = await checkMigrationHealth();

    if (req.url === '/metrics') {
        // Prometheus format
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        const up = health.status === 'ok' ? 1 : 0;
        res.end(`# HELP migration_health_up Status of migration system\n# TYPE migration_health_up gauge\nmigration_health_up ${up}\n`);
        return;
    }

    const code = health.status === 'ok' ? 200 : 503;
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
  } else {
    res.writeHead(404);
    res.end();
  }
});

if (require.main === module) {
    server.listen(PORT, () => {
    console.log(`Migration Health Monitor listening on port ${PORT}`);
    });
}
