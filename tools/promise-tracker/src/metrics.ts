/**
 * Promise Tracker - Prometheus Metrics Exporter
 *
 * Exports backlog health metrics to Prometheus for Grafana dashboards.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { createServer } from 'http';
import type { BacklogDatabase, StagingItem } from './schema.js';

const DATA_DIR = join(process.cwd(), '.promise-tracker');
const PORT = parseInt(process.env.PROMISE_TRACKER_METRICS_PORT || '9190', 10);

// =============================================================================
// Data Loading
// =============================================================================

async function loadBacklogData(): Promise<BacklogDatabase | null> {
  try {
    const data = await readFile(join(DATA_DIR, 'backlog.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function loadStagingData(): Promise<StagingItem[]> {
  try {
    const data = await readFile(join(DATA_DIR, 'staging.json'), 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.staging || [];
  } catch {
    return [];
  }
}

// =============================================================================
// Metrics Generation
// =============================================================================

async function generateMetrics(): Promise<string> {
  const [backlog, staging] = await Promise.all([loadBacklogData(), loadStagingData()]);

  const items = backlog?.items || [];
  const lines: string[] = [];

  // Helper to add metric
  const addMetric = (name: string, help: string, type: string, value: number, labels: Record<string, string> = {}) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    if (labelStr) {
      lines.push(`${name}{${labelStr}} ${value}`);
    } else {
      lines.push(`${name} ${value}`);
    }
  };

  // Total items
  addMetric('promise_tracker_total_items', 'Total number of backlog items', 'gauge', items.length + staging.length);

  // Doc-only count
  const docOnlyCount = staging.filter((item) => !item.processed).length;
  addMetric('promise_tracker_doc_only_count', 'Items captured but not tracked', 'gauge', docOnlyCount);

  // Stale in-progress
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const staleInProgress = items.filter((item) => {
    if (item.status !== 'in_progress') return false;
    if (!item.started_at) return true;
    return new Date(item.started_at) < twoWeeksAgo;
  }).length;
  addMetric('promise_tracker_stale_in_progress', 'Items in progress for over 14 days', 'gauge', staleInProgress);

  // Validation rate
  const inProdOrValidated = items.filter((i) => ['in_prod', 'validated'].includes(i.status));
  const validated = items.filter((i) => i.status === 'validated');
  const validatedRate = inProdOrValidated.length > 0 ? Math.round((validated.length / inProdOrValidated.length) * 100) : 100;
  addMetric('promise_tracker_validated_rate', 'Percentage of prod items that are validated', 'gauge', validatedRate);

  // Health score
  const healthScore = Math.min(100, Math.max(0, 100 - docOnlyCount - staleInProgress * 5 + validatedRate / 2));
  addMetric('promise_tracker_health_score', 'Overall backlog health score 0-100', 'gauge', healthScore);

  // Items by status
  const statusCounts: Record<string, number> = {};
  items.forEach((item) => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });

  lines.push('# HELP promise_tracker_items_by_status Count of items by status');
  lines.push('# TYPE promise_tracker_items_by_status gauge');
  Object.entries(statusCounts).forEach(([status, count]) => {
    lines.push(`promise_tracker_items_by_status{status="${status}"} ${count}`);
  });

  // Items by component
  const componentCounts: Record<string, number> = {};
  items.forEach((item) => {
    componentCounts[item.component] = (componentCounts[item.component] || 0) + 1;
  });
  staging.forEach((item) => {
    const comp = item.component || 'Other';
    componentCounts[comp] = (componentCounts[comp] || 0) + 1;
  });

  lines.push('# HELP promise_tracker_items_by_component Count of items by component');
  lines.push('# TYPE promise_tracker_items_by_component gauge');
  Object.entries(componentCounts).forEach(([component, count]) => {
    lines.push(`promise_tracker_items_by_component{component="${component}"} ${count}`);
  });

  // Definition of Done completion
  const dodFields = [
    'code_merged',
    'tests_exist_and_pass',
    'feature_exposed',
    'docs_updated',
    'telemetry_wired',
    'deployed_to_staging',
    'deployed_to_prod',
    'validated_with_usage',
  ] as const;

  lines.push('# HELP promise_tracker_dod_completion Definition of Done completion percentage by field');
  lines.push('# TYPE promise_tracker_dod_completion gauge');
  dodFields.forEach((field) => {
    const completed = items.filter((item) => item.definition_of_done?.[field]).length;
    const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
    lines.push(`promise_tracker_dod_completion{field="${field}"} ${pct}`);
  });

  // Average days to validated
  const completedItems = items.filter(
    (item) => item.status === 'validated' && item.started_at && item.validated_at
  );
  if (completedItems.length > 0) {
    const totalDays = completedItems.reduce((sum, item) => {
      const start = new Date(item.started_at!);
      const end = new Date(item.validated_at!);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    const avgDays = Math.round(totalDays / completedItems.length);
    addMetric('promise_tracker_avg_days_to_validated', 'Average days from ready to validated', 'gauge', avgDays);
  }

  // Counters for completed and validated totals
  const completedTotal = items.filter((i) => ['in_prod', 'validated', 'wont_do'].includes(i.status)).length;
  const validatedTotal = items.filter((i) => i.status === 'validated').length;
  addMetric('promise_tracker_items_completed_total', 'Total items completed', 'counter', completedTotal);
  addMetric('promise_tracker_items_validated_total', 'Total items validated', 'counter', validatedTotal);

  return lines.join('\n') + '\n';
}

// =============================================================================
// HTTP Server
// =============================================================================

export function startMetricsServer(): void {
  const server = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        const metrics = await generateMetrics();
        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
        res.end(metrics);
      } catch (error) {
        res.writeHead(500);
        res.end('Error generating metrics');
      }
    } else if (req.url === '/health') {
      res.writeHead(200);
      res.end('OK');
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    console.log(`Promise Tracker metrics server running on http://localhost:${PORT}/metrics`);
  });
}

// =============================================================================
// CLI Entry Point
// =============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  startMetricsServer();
}

export default startMetricsServer;
