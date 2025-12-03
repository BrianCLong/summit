/**
 * Promise Tracker - Sync Module
 *
 * Syncs staging items to GitHub issues.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Octokit } from '@octokit/rest';
import type { StagingItem, BacklogItem, BacklogDatabase } from './schema.js';

const DATA_DIR = join(process.cwd(), '.promise-tracker');

// =============================================================================
// Types
// =============================================================================

interface SyncOptions {
  dryRun?: boolean;
  limit?: number;
  component?: string;
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// =============================================================================
// Data Management
// =============================================================================

async function loadStagingData(): Promise<{ staging: StagingItem[]; stats: any }> {
  try {
    const data = await readFile(join(DATA_DIR, 'staging.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return { staging: [], stats: {} };
  }
}

async function loadBacklogData(): Promise<BacklogDatabase> {
  try {
    const data = await readFile(join(DATA_DIR, 'backlog.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      epics: [],
      items: [],
      staging: [],
    };
  }
}

async function saveBacklogData(backlog: BacklogDatabase): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  backlog.last_updated = new Date().toISOString();
  await writeFile(join(DATA_DIR, 'backlog.json'), JSON.stringify(backlog, null, 2));
}

async function saveStagingData(staging: StagingItem[], stats: any): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'staging.json'), JSON.stringify({ staging, stats }, null, 2));
}

// =============================================================================
// GitHub Integration
// =============================================================================

function createIssueBody(item: StagingItem): string {
  const lines: string[] = [];

  lines.push('## Description');
  lines.push('');
  lines.push(item.notes);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Source');
  lines.push('');
  lines.push(`- **Captured from:** \`${item.raw_source}\``);
  lines.push(`- **Captured at:** ${item.captured_at}`);
  lines.push(`- **Confidence:** ${item.confidence}`);
  lines.push(`- **Estimated scope:** ${item.scope_class}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Acceptance Criteria');
  lines.push('');
  lines.push('- [ ] AC-1: [Define specific criterion]');
  lines.push('- [ ] AC-2: [Define specific criterion]');
  lines.push('- [ ] AC-3: [Define specific criterion]');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Definition of Done');
  lines.push('');
  lines.push('- [ ] **Code merged** to main branch');
  lines.push('- [ ] **Tests exist and pass** (unit + integration/E2E)');
  lines.push('- [ ] **Feature exposed** in UI/API/CLI');
  lines.push('- [ ] **Docs updated** (user-facing + runbook)');
  lines.push('- [ ] **Telemetry wired** (metrics + logs)');
  lines.push('- [ ] **Deployed to staging**');
  lines.push('- [ ] **Deployed to production**');
  lines.push('- [ ] **Validated** with real usage evidence');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  lines.push('_Fill in as you complete work:_');
  lines.push('');
  lines.push('**PRs:** ');
  lines.push('**Test Runs:** ');
  lines.push('**Demo:** ');
  lines.push('**Validated by:** ');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Created by Promise Tracker*');

  return lines.join('\n');
}

function mapComponentToLabel(component: string): string[] {
  const labels = ['promise-tracked'];

  const componentLabels: Record<string, string> = {
    Summit: 'component:summit',
    CompanyOS: 'component:companyos',
    Maestro: 'component:maestro',
    Switchboard: 'component:switchboard',
    IntelGraph: 'component:intelgraph',
    Conductor: 'component:conductor',
    GraphAPI: 'component:graphql',
    Analytics: 'component:analytics',
    Copilot: 'component:copilot',
    Auth: 'component:auth',
    'CI/CD': 'component:ci-cd',
    Observability: 'component:observability',
    Infrastructure: 'component:infra',
    Documentation: 'component:docs',
    Testing: 'component:testing',
    Security: 'component:security',
    Data: 'component:data',
    'UI/UX': 'component:ui',
    Other: 'component:other',
  };

  if (componentLabels[component]) {
    labels.push(componentLabels[component]);
  }

  return labels;
}

function mapTypeToLabel(type: string | undefined): string {
  const typeLabels: Record<string, string> = {
    feature: 'feature',
    tech_debt: 'tech-debt',
    bug: 'bug',
    spike: 'spike',
    doc: 'documentation',
    ops: 'ops',
    security: 'security',
    performance: 'performance',
    refactor: 'refactor',
    integration: 'integration',
  };

  return typeLabels[type || 'feature'] || 'feature';
}

// =============================================================================
// Sync Logic
// =============================================================================

export async function syncToGitHub(options: SyncOptions = {}): Promise<SyncResult> {
  const { dryRun = false, limit = 10, component } = options;

  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Load data
  const { staging, stats } = await loadStagingData();
  const backlog = await loadBacklogData();

  if (staging.length === 0) {
    console.log('No staging items to sync. Run `promise-tracker extract` first.');
    return result;
  }

  // Filter items
  let itemsToSync = staging.filter((item) => !item.processed);

  if (component) {
    itemsToSync = itemsToSync.filter((item) => item.component === component);
  }

  // Sort by confidence (high first)
  itemsToSync.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.confidence] || 2) - (order[b.confidence] || 2);
  });

  // Limit
  itemsToSync = itemsToSync.slice(0, limit);

  console.log(`\nProcessing ${itemsToSync.length} items...`);

  if (!dryRun) {
    // Initialize GitHub client
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      result.errors.push('GITHUB_TOKEN environment variable not set');
      return result;
    }

    const octokit = new Octokit({ auth: token });

    // Get repo info from git remote
    const repoOwner = process.env.GITHUB_OWNER || 'BrianCLong';
    const repoName = process.env.GITHUB_REPO || 'summit';

    for (const item of itemsToSync) {
      try {
        console.log(`  Creating issue: ${item.rough_title.slice(0, 50)}...`);

        const labels = [
          ...mapComponentToLabel(item.component || 'Other'),
          mapTypeToLabel(item.suggested_type),
        ];

        const response = await octokit.issues.create({
          owner: repoOwner,
          repo: repoName,
          title: item.rough_title,
          body: createIssueBody(item),
          labels,
        });

        // Mark as processed and convert to backlog item
        item.processed = true;
        item.backlog_item_id = `BL-${response.data.number}`;

        const backlogItem: BacklogItem = {
          id: item.backlog_item_id,
          github_issue_id: response.data.number,
          github_issue_url: response.data.html_url,
          title: item.rough_title,
          description: item.notes,
          component: (item.component as any) || 'Other',
          type: (item.suggested_type as any) || 'feature',
          priority: 'P2-nice-to-have',
          status: 'idea',
          scope_class: item.scope_class as any,
          confidence: item.confidence as any,
          acceptance_criteria: [],
          definition_of_done: {
            code_merged: false,
            tests_exist_and_pass: false,
            feature_exposed: false,
            docs_updated: false,
            telemetry_wired: false,
            deployed_to_staging: false,
            deployed_to_prod: false,
            validated_with_usage: false,
          },
          evidence: { pr_urls: [], test_run_urls: [], demo_urls: [], screenshots: [] },
          sources: [
            {
              type: item.raw_source.endsWith('.md') ? 'doc' : 'code',
              file_path: item.raw_source,
              captured_at: item.captured_at,
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        backlog.items.push(backlogItem);
        result.created++;

        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        result.errors.push(`Failed to create issue for "${item.rough_title}": ${error.message}`);
      }
    }

    // Save updated data
    await saveBacklogData(backlog);
    await saveStagingData(staging, stats);
  } else {
    // Dry run - just count
    for (const item of itemsToSync) {
      console.log(`  [DRY RUN] Would create: ${item.rough_title.slice(0, 60)}`);
      console.log(`            Component: ${item.component || 'Other'}`);
      console.log(`            Labels: ${mapComponentToLabel(item.component || 'Other').join(', ')}`);
      result.created++;
    }
  }

  return result;
}

export default syncToGitHub;
