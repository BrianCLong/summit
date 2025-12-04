/**
 * Promise Tracker - Report Module
 *
 * Generates various reports on backlog health and status.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { table } from 'table';
import type { BacklogDatabase, BacklogItem, StagingItem } from './schema.js';

const DATA_DIR = join(process.cwd(), '.promise-tracker');

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
// Report Generation
// =============================================================================

interface ReportData {
  backlog: BacklogDatabase | null;
  staging: StagingItem[];
  timestamp: string;
}

async function collectData(): Promise<ReportData> {
  const [backlog, staging] = await Promise.all([loadBacklogData(), loadStagingData()]);

  return {
    backlog,
    staging,
    timestamp: new Date().toISOString(),
  };
}

function generateTableReport(data: ReportData): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('PROMISE TRACKER - BACKLOG HEALTH REPORT');
  lines.push(`Generated: ${data.timestamp}`);
  lines.push('='.repeat(60));
  lines.push('');

  // Staging summary
  lines.push('STAGING ITEMS (Captured but not yet in backlog)');
  lines.push('-'.repeat(40));

  if (data.staging.length === 0) {
    lines.push('No staging items found. Run `promise-tracker extract` first.');
  } else {
    // Group by component
    const byComponent = data.staging.reduce(
      (acc, item) => {
        const comp = item.component || 'Other';
        acc[comp] = (acc[comp] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const componentTable = [
      ['Component', 'Count'],
      ...Object.entries(byComponent).sort((a, b) => b[1] - a[1]),
    ];

    lines.push(table(componentTable));
    lines.push(`Total staging items: ${data.staging.length}`);

    // Group by confidence
    const byConfidence = data.staging.reduce(
      (acc, item) => {
        acc[item.confidence] = (acc[item.confidence] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    lines.push('');
    lines.push('By Confidence:');
    Object.entries(byConfidence).forEach(([conf, count]) => {
      lines.push(`  ${conf}: ${count}`);
    });

    // Sample items
    lines.push('');
    lines.push('Sample Staging Items:');
    lines.push('-'.repeat(40));

    data.staging.slice(0, 10).forEach((item, i) => {
      lines.push(`${i + 1}. [${item.component || 'Other'}] ${item.rough_title.slice(0, 70)}`);
      lines.push(`   Source: ${item.raw_source}`);
      lines.push(`   Confidence: ${item.confidence} | Scope: ${item.scope_class}`);
      lines.push('');
    });
  }

  // Backlog summary
  if (data.backlog) {
    lines.push('');
    lines.push('BACKLOG ITEMS (Tracked in system)');
    lines.push('-'.repeat(40));

    const items = data.backlog.items;

    // By status
    const byStatus = items.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const statusTable = [
      ['Status', 'Count'],
      ...Object.entries(byStatus).sort((a, b) => {
        const order = ['idea', 'ready', 'in_progress', 'in_review', 'in_prod', 'validated', 'blocked', 'wont_do'];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      }),
    ];

    lines.push(table(statusTable));

    // Definition of Done completion
    lines.push('Definition of Done Completion:');
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

    dodFields.forEach((field) => {
      const completed = items.filter((item) => item.definition_of_done?.[field]).length;
      const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
      lines.push(`  ${field}: ${completed}/${items.length} (${pct}%)`);
    });

    // Missing acceptance criteria
    const missingAC = items.filter((item) => !item.acceptance_criteria || item.acceptance_criteria.length === 0);
    lines.push('');
    lines.push(`Items missing acceptance criteria: ${missingAC.length}`);

    // Stale in-progress (> 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const staleInProgress = items.filter((item) => {
      if (item.status !== 'in_progress') return false;
      if (!item.started_at) return true; // No start date = stale
      return new Date(item.started_at) < twoWeeksAgo;
    });

    lines.push(`Stale in-progress items (>14 days): ${staleInProgress.length}`);
    if (staleInProgress.length > 0) {
      staleInProgress.slice(0, 5).forEach((item) => {
        lines.push(`  - ${item.title.slice(0, 50)}`);
      });
    }
  }

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('END OF REPORT');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

function generateMarkdownReport(data: ReportData): string {
  const lines: string[] = [];

  lines.push('# Promise Tracker - Backlog Health Report');
  lines.push('');
  lines.push(`**Generated:** ${data.timestamp}`);
  lines.push('');

  // Staging section
  lines.push('## Staging Items');
  lines.push('');
  lines.push('Items captured from codebase but not yet converted to tracked issues.');
  lines.push('');

  if (data.staging.length === 0) {
    lines.push('> No staging items found. Run `promise-tracker extract` to scan the codebase.');
  } else {
    // Component breakdown
    lines.push('### By Component');
    lines.push('');
    lines.push('| Component | Count |');
    lines.push('|-----------|-------|');

    const byComponent = data.staging.reduce(
      (acc, item) => {
        const comp = item.component || 'Other';
        acc[comp] = (acc[comp] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    Object.entries(byComponent)
      .sort((a, b) => b[1] - a[1])
      .forEach(([comp, count]) => {
        lines.push(`| ${comp} | ${count} |`);
      });

    lines.push('');
    lines.push(`**Total:** ${data.staging.length} staging items`);

    // High confidence items
    const highConfidence = data.staging.filter((item) => item.confidence === 'high');
    if (highConfidence.length > 0) {
      lines.push('');
      lines.push('### High Confidence Items (Likely Actionable)');
      lines.push('');
      highConfidence.slice(0, 10).forEach((item) => {
        lines.push(`- **[${item.component || 'Other'}]** ${item.rough_title.slice(0, 80)}`);
        lines.push(`  - Source: \`${item.raw_source}\``);
      });
    }
  }

  // Backlog section
  if (data.backlog) {
    lines.push('');
    lines.push('## Tracked Backlog');
    lines.push('');

    const items = data.backlog.items;

    // Status breakdown
    lines.push('### By Status');
    lines.push('');
    lines.push('| Status | Count |');
    lines.push('|--------|-------|');

    const byStatus = items.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const statusOrder = ['idea', 'ready', 'in_progress', 'in_review', 'in_prod', 'validated', 'blocked', 'wont_do'];
    statusOrder.forEach((status) => {
      if (byStatus[status]) {
        lines.push(`| ${status} | ${byStatus[status]} |`);
      }
    });

    // Health indicators
    lines.push('');
    lines.push('### Health Indicators');
    lines.push('');

    const missingAC = items.filter((item) => !item.acceptance_criteria?.length).length;
    const validatedRate = items.filter((i) => i.status === 'in_prod').length > 0
      ? Math.round(
          (items.filter((i) => i.status === 'validated').length /
            items.filter((i) => ['in_prod', 'validated'].includes(i.status)).length) *
            100
        )
      : 0;

    lines.push(`- Missing acceptance criteria: ${missingAC > 0 ? '**' + missingAC + '**' : missingAC}`);
    lines.push(`- Validation rate (prod items validated): ${validatedRate}%`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Report generated by Promise Tracker*');

  return lines.join('\n');
}

function generateJsonReport(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}

// =============================================================================
// Main Export
// =============================================================================

export async function generateReport(format: 'json' | 'markdown' | 'table' = 'table'): Promise<string> {
  const data = await collectData();

  switch (format) {
    case 'json':
      return generateJsonReport(data);
    case 'markdown':
      return generateMarkdownReport(data);
    case 'table':
    default:
      return generateTableReport(data);
  }
}

export default generateReport;
