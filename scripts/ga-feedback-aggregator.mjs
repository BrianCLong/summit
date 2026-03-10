#!/usr/bin/env node

/**
 * Summit GA Feedback Aggregator
 * 
 * Purpose: Consolidates user feedback, AI insights (rejections), and GitHub P0/P1 issues
 * to provide a unified "Launch Week Health" signal for operators.
 */

import { execSync } from 'child_process';

async function getPostgresFeedback() {
  try {
    // In a real env, we'd use pg client. Here we mock/simulate or use psql if available.
    // We'll simulate a count for demonstration of the signal logic.
    console.log('📊 Querying Postgres for ML rejections (ai_insights)...');
    // const result = execSync('psql $DATABASE_URL -t -c "SELECT count(*) FROM ai_insights WHERE status = \'REJECTED\' AND decided_at > NOW() - INTERVAL \'1 hour\'"').toString().trim();
    return { count: 2, status: 'OK' }; 
  } catch (err) {
    return { count: 0, status: 'ERROR', message: err.message };
  }
}

async function getGitHubIssues() {
  try {
    console.log('🐙 Querying GitHub for P0/P1 issues...');
    // Simulated gh cli call
    // const result = execSync('gh issue list --label "priority/p0-blocking","priority/p1-critical" --json id,title,createdAt').toString();
    return [
      { id: 'I1', title: 'Critical: Ingest queue stuck', priority: 'P0', createdAt: new Date().toISOString() }
    ];
  } catch (err) {
    return [];
  }
}

async function getPrometheusMetrics() {
  try {
    console.log('📈 Fetching error rates from Prometheus...');
    // Simulated prometheus query
    return { errorRate: 0.015 }; // 1.5%
  } catch (err) {
    return { errorRate: 0 };
  }
}

async function run() {
  console.log('🚀 Aggregating Summit GA Launch Signals...\n');

  const [pg, issues, prom] = await Promise.all([
    getPostgresFeedback(),
    getGitHubIssues(),
    getPrometheusMetrics()
  ]);

  const summary = {
    timestamp: new Date().toISOString(),
    ai_rejections_1h: pg.count,
    p0_p1_issues_count: issues.length,
    p95_error_rate: prom.errorRate,
    health_score: 100
  };

  // Logic to calculate a "Launch Health Score"
  summary.health_score -= (summary.p0_p1_issues_count * 20);
  summary.health_score -= (summary.ai_rejections_1h * 5);
  if (summary.p95_error_rate > 0.01) summary.health_score -= 10;

  console.log('--- Launch Health Summary ---');
  console.log(`Health Score: ${summary.health_score}/100`);
  console.log(`P0/P1 Issues: ${summary.p0_p1_issues_count}`);
  console.log(`AI Rejections (1h): ${summary.ai_rejections_1h}`);
  console.log(`Error Rate: ${(summary.p95_error_rate * 100).toFixed(1)}%`);

  if (summary.health_score < 70) {
    console.log('\n⚠️  WARNING: Launch health is deteriorating. Triggering Triage Protocol.');
  } else {
    console.log('\n✅ Launch health is within stable bounds.');
  }

  // In real use, this would push to Prometheus via pushgateway or update a status page.
  console.log('\nSignal aggregation complete.');
}

run();
