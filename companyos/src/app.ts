/**
 * CompanyOS Application Entry Point
 * Main Express application for internal operations
 */

import express, { Application } from 'express';
import { Pool } from 'pg';
import { createCompanyOSRouter } from './api/index.js';
import { createGitHubWebhookRouter } from './integrations/githubWebhook.js';
import { createPrometheusWebhookRouter } from './integrations/prometheusWebhook.js';

export interface CompanyOSConfig {
  db: Pool;
  enableGitHubWebhook?: boolean;
  enablePrometheusWebhook?: boolean;
}

export function createCompanyOSApp(config: CompanyOSConfig): Application {
  const app = express();

  // Middleware
  app.use(express.json());

  // Mount CompanyOS API routes
  app.use('/api/companyos', createCompanyOSRouter(config.db));

  // Mount GitHub webhook integration
  if (config.enableGitHubWebhook !== false) {
    app.use('/webhooks', createGitHubWebhookRouter(config.db));
  }

  // Mount Prometheus webhook integration
  if (config.enablePrometheusWebhook !== false) {
    app.use('/webhooks', createPrometheusWebhookRouter(config.db));
  }

  return app;
}

// Standalone server (when run directly)
async function startServer(): Promise<void> {
  const port = process.env.COMPANYOS_PORT || 3001;
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/summit';

  const db = new Pool({
    connectionString: databaseUrl,
  });

  // Test database connection
  try {
    await db.query('SELECT 1');
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }

  const app = createCompanyOSApp({
    db,
    enableGitHubWebhook: true,
    enablePrometheusWebhook: true,
  });

  app.listen(port, () => {
    console.log(`CompanyOS API running on port ${port}`);
    console.log(`Dashboard: http://localhost:${port}/api/companyos/dashboard`);
    console.log(`Health: http://localhost:${port}/api/companyos/health`);
    console.log(`GitHub Webhook: http://localhost:${port}/webhooks/github-webhook`);
    console.log(`Prometheus Webhook: http://localhost:${port}/webhooks/prometheus-webhook`);
  });
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}
