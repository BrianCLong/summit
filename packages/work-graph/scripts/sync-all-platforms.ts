#!/usr/bin/env npx tsx
/**
 * Summit Work Graph - Full Platform Sync CLI
 *
 * Syncs all work items across GitHub, Linear, Notion, and Jira.
 * Run with: npx tsx scripts/sync-all-platforms.ts
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

interface SyncStats {
  github: { total: number; enriched: number; byMilestone: Record<string, number> };
  linear: { synced: number; errors: number };
  notion: { synced: number; errors: number };
  jira: { synced: number; errors: number };
}

const stats: SyncStats = {
  github: { total: 0, enriched: 0, byMilestone: {} },
  linear: { synced: 0, errors: 0 },
  notion: { synced: 0, errors: 0 },
  jira: { synced: 0, errors: 0 },
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function getGitHubStats(): Promise<void> {
  log('\n📊 Gathering GitHub Statistics...', 'cyan');

  // Get total open issues
  const countJson = execSync(
    'gh issue list --repo BrianCLong/summit --state open --limit 1 --json number | wc -l',
    { encoding: 'utf-8' }
  );

  // Get enriched count
  const enrichedJson = execSync(
    'gh issue list --repo BrianCLong/summit --state open --label enriched --limit 1000 --json number',
    { encoding: 'utf-8' }
  );
  stats.github.enriched = JSON.parse(enrichedJson).length;

  // Get by milestone
  const milestones = [
    'Sprint 1: Governance & Critical Security',
    'Sprint 2: CI/CD & Release Ops',
    'Sprint 3: Docker & Containerization',
    'Q2 2026: Platform Expansion',
    'Q3 2026: Feature Release',
    'Q4 2026: Hardening & Polish',
    'Backlog'
  ];

  for (const milestone of milestones) {
    try {
      const issuesJson = execSync(
        `gh issue list --repo BrianCLong/summit --state open --milestone "${milestone}" --limit 1000 --json number`,
        { encoding: 'utf-8' }
      );
      const count = JSON.parse(issuesJson).length;
      stats.github.byMilestone[milestone] = count;
      stats.github.total += count;
    } catch {
      stats.github.byMilestone[milestone] = 0;
    }
  }

  log(`   Total open issues: ${stats.github.total}`, 'green');
  log(`   Enriched issues: ${stats.github.enriched}`, 'green');
  log('\n   By Milestone:', 'blue');
  for (const [name, count] of Object.entries(stats.github.byMilestone)) {
    log(`     ${name}: ${count}`);
  }
}

async function syncToLinear(): Promise<void> {
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_TEAM_ID;

  if (!apiKey || !teamId) {
    log('\n⏭️  Skipping Linear sync (LINEAR_API_KEY/LINEAR_TEAM_ID not set)', 'yellow');
    return;
  }

  log('\n📤 Syncing to Linear...', 'cyan');

  // Get issues to sync (enriched, not yet synced to Linear)
  const issuesJson = execSync(
    'gh issue list --repo BrianCLong/summit --state open --label enriched --limit 50 --json number,title,body,labels',
    { encoding: 'utf-8' }
  );

  const issues = JSON.parse(issuesJson) as Array<{
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
  }>;

  const toSync = issues.filter(
    i => !i.labels.some(l => l.name === 'synced:linear')
  );

  log(`   Found ${toSync.length} issues to sync`, 'blue');

  for (const issue of toSync.slice(0, 20)) {
    try {
      // Determine priority
      let priority = 3;
      if (issue.labels.some(l => l.name.includes('critical'))) priority = 1;
      else if (issue.labels.some(l => l.name.includes('high'))) priority = 2;
      else if (issue.labels.some(l => l.name.includes('low'))) priority = 4;

      const mutation = `
        mutation CreateIssue($teamId: String!, $title: String!, $description: String, $priority: Int) {
          issueCreate(input: {
            teamId: $teamId
            title: $title
            description: $description
            priority: $priority
          }) {
            success
            issue { id identifier url }
          }
        }
      `;

      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            teamId,
            title: issue.title,
            description: `${issue.body.slice(0, 5000)}\n\n---\n🔗 GitHub: https://github.com/BrianCLong/summit/issues/${issue.number}`,
            priority,
          },
        }),
      });

      const data = await response.json() as { data?: { issueCreate?: { success: boolean } } };
      if (data.data?.issueCreate?.success) {
        stats.linear.synced++;
        execSync(`gh issue edit ${issue.number} --repo BrianCLong/summit --add-label "synced:linear"`, { encoding: 'utf-8' });
        log(`   ✓ Synced #${issue.number}`, 'green');
      }
    } catch (error) {
      stats.linear.errors++;
      log(`   ✗ Failed #${issue.number}: ${error}`, 'red');
    }
  }

  log(`   Linear sync complete: ${stats.linear.synced} synced, ${stats.linear.errors} errors`, 'green');
}

async function syncToNotion(): Promise<void> {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    log('\n⏭️  Skipping Notion sync (NOTION_API_KEY/NOTION_DATABASE_ID not set)', 'yellow');
    return;
  }

  log('\n📤 Syncing to Notion...', 'cyan');

  // Get issues to sync
  const issuesJson = execSync(
    'gh issue list --repo BrianCLong/summit --state open --label enriched --limit 50 --json number,title,body,labels',
    { encoding: 'utf-8' }
  );

  const issues = JSON.parse(issuesJson) as Array<{
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
  }>;

  const toSync = issues.filter(
    i => !i.labels.some(l => l.name === 'synced:notion')
  );

  log(`   Found ${toSync.length} issues to sync`, 'blue');

  for (const issue of toSync.slice(0, 20)) {
    try {
      // Determine priority
      let priority = 'Medium';
      if (issue.labels.some(l => l.name.includes('critical'))) priority = 'Critical';
      else if (issue.labels.some(l => l.name.includes('high'))) priority = 'High';
      else if (issue.labels.some(l => l.name.includes('low'))) priority = 'Low';

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            Name: { title: [{ text: { content: issue.title } }] },
            Priority: { select: { name: priority } },
            'GitHub Link': { url: `https://github.com/BrianCLong/summit/issues/${issue.number}` },
          },
        }),
      });

      if (response.ok) {
        stats.notion.synced++;
        execSync(`gh issue edit ${issue.number} --repo BrianCLong/summit --add-label "synced:notion"`, { encoding: 'utf-8' });
        log(`   ✓ Synced #${issue.number}`, 'green');
      }
    } catch (error) {
      stats.notion.errors++;
      log(`   ✗ Failed #${issue.number}: ${error}`, 'red');
    }
  }

  log(`   Notion sync complete: ${stats.notion.synced} synced, ${stats.notion.errors} errors`, 'green');
}

async function syncToJira(): Promise<void> {
  const host = process.env.JIRA_HOST;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!host || !email || !apiToken || !projectKey) {
    log('\n⏭️  Skipping Jira sync (JIRA_* environment variables not set)', 'yellow');
    return;
  }

  log('\n📤 Syncing to Jira...', 'cyan');

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

  // Get issues to sync
  const issuesJson = execSync(
    'gh issue list --repo BrianCLong/summit --state open --label enriched --limit 50 --json number,title,body,labels',
    { encoding: 'utf-8' }
  );

  const issues = JSON.parse(issuesJson) as Array<{
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
  }>;

  const toSync = issues.filter(
    i => !i.labels.some(l => l.name === 'synced:jira')
  );

  log(`   Found ${toSync.length} issues to sync`, 'blue');

  for (const issue of toSync.slice(0, 20)) {
    try {
      // Determine priority and type
      let priority = 'Medium';
      let issueType = 'Task';

      if (issue.labels.some(l => l.name.includes('critical'))) priority = 'Highest';
      else if (issue.labels.some(l => l.name.includes('high'))) priority = 'High';
      else if (issue.labels.some(l => l.name.includes('low'))) priority = 'Low';

      if (issue.labels.some(l => l.name.includes('bug'))) issueType = 'Bug';
      else if (issue.labels.some(l => l.name.includes('feature'))) issueType = 'Story';

      const response = await fetch(`https://${host}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            summary: issue.title,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: issue.body.slice(0, 5000) }],
                },
              ],
            },
            issuetype: { name: issueType },
            priority: { name: priority },
          },
        }),
      });

      if (response.ok) {
        stats.jira.synced++;
        execSync(`gh issue edit ${issue.number} --repo BrianCLong/summit --add-label "synced:jira"`, { encoding: 'utf-8' });
        log(`   ✓ Synced #${issue.number}`, 'green');
      }
    } catch (error) {
      stats.jira.errors++;
      log(`   ✗ Failed #${issue.number}: ${error}`, 'red');
    }
  }

  log(`   Jira sync complete: ${stats.jira.synced} synced, ${stats.jira.errors} errors`, 'green');
}

function printSummary(): void {
  log('\n' + '═'.repeat(60), 'cyan');
  log('📋 SYNC SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');

  log('\nGitHub:', 'blue');
  log(`  Total issues: ${stats.github.total}`);
  log(`  Enriched: ${stats.github.enriched} (${Math.round(stats.github.enriched / stats.github.total * 100)}%)`);

  log('\nLinear:', 'blue');
  if (stats.linear.synced > 0 || stats.linear.errors > 0) {
    log(`  Synced: ${stats.linear.synced}`, 'green');
    if (stats.linear.errors > 0) log(`  Errors: ${stats.linear.errors}`, 'red');
  } else {
    log('  Not configured', 'yellow');
  }

  log('\nNotion:', 'blue');
  if (stats.notion.synced > 0 || stats.notion.errors > 0) {
    log(`  Synced: ${stats.notion.synced}`, 'green');
    if (stats.notion.errors > 0) log(`  Errors: ${stats.notion.errors}`, 'red');
  } else {
    log('  Not configured', 'yellow');
  }

  log('\nJira:', 'blue');
  if (stats.jira.synced > 0 || stats.jira.errors > 0) {
    log(`  Synced: ${stats.jira.synced}`, 'green');
    if (stats.jira.errors > 0) log(`  Errors: ${stats.jira.errors}`, 'red');
  } else {
    log('  Not configured', 'yellow');
  }

  log('\n' + '═'.repeat(60), 'cyan');

  // Save stats to file
  const statsFile = '/tmp/work-graph-sync-stats.json';
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
  log(`\n📄 Stats saved to: ${statsFile}`, 'blue');
}

async function main(): Promise<void> {
  log('🚀 Summit Work Graph - Full Platform Sync', 'cyan');
  log('═'.repeat(60), 'cyan');

  await getGitHubStats();
  await syncToLinear();
  await syncToNotion();
  await syncToJira();

  printSummary();

  log('\n✅ Sync complete!', 'green');
}

main().catch(console.error);
