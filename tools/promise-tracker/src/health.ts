/**
 * Promise Tracker - Health Module
 *
 * Calculates backlog health metrics for dashboards and CI gates.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { BacklogDatabase, BacklogHealth, StagingItem } from './schema.js';

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
// Metrics Calculation
// =============================================================================

export async function generateHealthMetrics(): Promise<BacklogHealth> {
  const [backlog, staging] = await Promise.all([loadBacklogData(), loadStagingData()]);

  const items = backlog?.items || [];

  // Count by status
  const byStatus: Record<string, number> = {};
  items.forEach((item) => {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  });

  // Count by component
  const byComponent: Record<string, number> = {};
  items.forEach((item) => {
    byComponent[item.component] = (byComponent[item.component] || 0) + 1;
  });

  // Also count staging items by component
  staging.forEach((item) => {
    const comp = item.component || 'Other';
    byComponent[comp] = (byComponent[comp] || 0) + 1;
  });

  // Count by priority
  const byPriority: Record<string, number> = {};
  items.forEach((item) => {
    byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
  });

  // Doc-only count (staging items that haven't been converted)
  const docOnlyCount = staging.filter((item) => !item.processed).length;

  // Stale in-progress (> 14 days)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const staleInProgress = items.filter((item) => {
    if (item.status !== 'in_progress') return false;
    if (!item.started_at) return true;
    return new Date(item.started_at) < twoWeeksAgo;
  }).length;

  // Missing acceptance criteria
  const missingAC = items.filter((item) => !item.acceptance_criteria || item.acceptance_criteria.length === 0).length;

  // Missing definition of done (items that are "in_prod" but not fully complete)
  const missingDoD = items.filter((item) => {
    if (!['in_prod', 'validated'].includes(item.status)) return false;
    const dod = item.definition_of_done;
    if (!dod) return true;
    return !(dod.code_merged && dod.tests_exist_and_pass && dod.deployed_to_prod);
  }).length;

  // Validation rate
  const inProdOrValidated = items.filter((i) => ['in_prod', 'validated'].includes(i.status));
  const validated = items.filter((i) => i.status === 'validated');
  const validatedRate =
    inProdOrValidated.length > 0 ? Math.round((validated.length / inProdOrValidated.length) * 100) : 100;

  // Average days from ready to validated
  const completedItems = items.filter(
    (item) => item.status === 'validated' && item.started_at && item.validated_at
  );

  let avgDays: number | undefined;
  if (completedItems.length > 0) {
    const totalDays = completedItems.reduce((sum, item) => {
      const start = new Date(item.started_at!);
      const end = new Date(item.validated_at!);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDays = Math.round(totalDays / completedItems.length);
  }

  return {
    total_items: items.length + staging.length,
    by_status: byStatus as any,
    by_component: byComponent as any,
    by_priority: byPriority as any,
    doc_only_count: docOnlyCount,
    stale_in_progress: staleInProgress,
    missing_acceptance_criteria: missingAC,
    missing_definition_of_done: missingDoD,
    validated_rate: validatedRate,
    avg_days_ready_to_validated: avgDays,
    generated_at: new Date().toISOString(),
  };
}

// =============================================================================
// Health Score Calculation
// =============================================================================

export interface HealthScore {
  overall: number; // 0-100
  dimensions: {
    completeness: number;
    velocity: number;
    quality: number;
    clarity: number;
  };
  issues: string[];
  recommendations: string[];
}

export async function calculateHealthScore(): Promise<HealthScore> {
  const metrics = await generateHealthMetrics();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Completeness: How many items make it to validated?
  let completeness = metrics.validated_rate;
  if (completeness < 50) {
    issues.push(`Low validation rate: ${completeness}%`);
    recommendations.push('Increase focus on validating deployed features with real usage evidence');
  }

  // Velocity: Are items moving through the pipeline?
  let velocity = 100;
  if (metrics.stale_in_progress > 0) {
    velocity -= metrics.stale_in_progress * 10;
    issues.push(`${metrics.stale_in_progress} items stuck in progress for >14 days`);
    recommendations.push('Review and unblock stale in-progress items');
  }

  // Quality: Are items properly defined?
  let quality = 100;
  if (metrics.missing_acceptance_criteria > 0) {
    const pct = Math.round(
      (metrics.missing_acceptance_criteria / (metrics.total_items || 1)) * 100
    );
    quality -= pct;
    issues.push(`${metrics.missing_acceptance_criteria} items missing acceptance criteria`);
    recommendations.push('Add acceptance criteria to all tracked items');
  }
  if (metrics.missing_definition_of_done > 0) {
    quality -= 10;
    issues.push(`${metrics.missing_definition_of_done} prod items missing DoD completion`);
    recommendations.push('Complete Definition of Done checklist for all deployed items');
  }

  // Clarity: How much is still in staging vs tracked?
  let clarity = 100;
  if (metrics.doc_only_count > 10) {
    clarity -= Math.min(50, metrics.doc_only_count * 2);
    issues.push(`${metrics.doc_only_count} items still in staging (not tracked)`);
    recommendations.push('Convert high-confidence staging items to tracked issues');
  }

  const overall = Math.round((completeness + velocity + quality + clarity) / 4);

  return {
    overall: Math.max(0, Math.min(100, overall)),
    dimensions: {
      completeness: Math.max(0, Math.min(100, completeness)),
      velocity: Math.max(0, Math.min(100, velocity)),
      quality: Math.max(0, Math.min(100, quality)),
      clarity: Math.max(0, Math.min(100, clarity)),
    },
    issues,
    recommendations,
  };
}

export default generateHealthMetrics;
