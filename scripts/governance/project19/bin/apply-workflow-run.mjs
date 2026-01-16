#!/usr/bin/env node

/**
 * Apply Workflow Run Script
 * Processes workflow run completion and updates Project fields based on artifacts
 */

import fs from 'fs';
import path from 'path';
import ItemOperations from '../lib/item-ops.mjs';
import MappingOperations from '../lib/mapping.mjs';
import ArtifactsOperations from '../lib/artifacts.mjs';
import ScoringOperations from '../lib/scoring.mjs';

// Load environment variables
const WORKFLOW_MAP_PATH = process.env.WORKFLOW_MAP || 'scripts/config/project19-workflow-map.json';
const PROJECT19_SCHEMA_PATH = process.env.PROJECT19_SCHEMA || 'scripts/config/project19-field-schema.json';
const SCORE_POLICY_PATH = process.env.SCORE_POLICY || 'scripts/config/project19-score-policy.json';
const DRY_RUN = process.env.DRY_RUN === 'false' ? false : true; // Default to true if not set
const MAX_FIX_SCOPE = parseInt(process.env.MAX_FIX_SCOPE) || 200;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Validate inputs
if (!GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

if (!fs.existsSync(WORKFLOW_MAP_PATH)) {
  console.error(`Workflow map file not found: ${WORKFLOW_MAP_PATH}`);
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);
const eventPath = args.find(arg => arg.startsWith('--event-path='))?.split('=')[1] || process.env.GITHUB_EVENT_PATH;
const projectId = args.find(arg => arg.startsWith('--project-id='))?.split('=')[1];

if (!projectId) {
  console.error('Project ID is required. Use --project-id=<project-id>');
  process.exit(1);
}

// Create output directory
const outputDir = path.join(process.cwd(), 'artifacts', 'project19', 'ci-signals');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  console.log(`Starting workflow run processing...`);
  console.log(`  Event Path: ${eventPath || 'Using GITHUB_EVENT_PATH'}`);
  console.log(`  Workflow Map: ${WORKFLOW_MAP_PATH}`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Dry Run: ${DRY_RUN}`);
  console.log(`  Max Fix Scope: ${MAX_FIX_SCOPE}`);

  try {
    // Load configurations
    const schema = JSON.parse(fs.readFileSync(PROJECT19_SCHEMA_PATH, 'utf8'));
    const mappingOps = new MappingOperations(null, WORKFLOW_MAP_PATH);
    const scoringOps = new ScoringOperations(SCORE_POLICY_PATH);
    const artifactsOps = new ArtifactsOperations();
    
    // Initialize item operations
    const itemOps = new ItemOperations(GITHUB_TOKEN);

    // Get the GitHub event
    let eventPayload = {};
    if (eventPath && fs.existsSync(eventPath)) {
      eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    } else if (process.env.GITHUB_EVENT_PATH) {
      eventPayload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    } else {
      console.error('No event file provided and GITHUB_EVENT_PATH not set');
      return;
    }

    console.log(`  Event Action: ${eventPayload.action}`);
    console.log(`  Workflow Name: ${eventPayload.workflow_run?.name}`);
    console.log(`  Conclusion: ${eventPayload.workflow_run?.conclusion}`);

    const workflowRun = eventPayload.workflow_run;
    if (!workflowRun) {
      console.error('No workflow_run found in event payload');
      return;
    }

    // Find associated issues/PRs from the workflow run
    console.log('  Finding associated issues/PRs...');
    const associatedItems = await findAssociatedProjectItems(workflowRun, itemOps, projectId);

    if (associatedItems.length === 0) {
      console.log('  No associated project items found. Nothing to update.');
      return;
    }

    console.log(`  Found ${associatedItems.length} associated items to update`);

    // Download artifacts for the workflow run
    console.log('  Downloading workflow artifacts...');
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    const owner = workflowRun.repository.owner.login;
    const repo = workflowRun.repository.name;
    const runId = workflowRun.id;

    let artifacts = {};
    try {
      artifacts = await artifactsOps.downloadWorkflowArtifacts(octokit, owner, repo, runId);
      console.log(`  Downloaded ${Object.keys(artifacts).length} artifacts`);
    } catch (error) {
      console.warn(`  Warning: Could not download artifacts: ${error.message}`);
    }

    // Parse the artifacts
    console.log('  Parsing artifacts...');
    const parsedArtifacts = artifactsOps.parseCommonArtifacts(artifacts);

    // Process each associated item
    for (const projectItem of associatedItems) {
      console.log(`  Processing item: ${projectItem.id}`);

      // Map workflow run and artifacts to field updates
      console.log('  Mapping workflow run to field updates...');
      const fieldUpdates = mappingOps.mapWorkflowRunToFields(workflowRun, parsedArtifacts);

      console.log(`  Determined ${Object.keys(fieldUpdates).length} field updates`);

      // Create item representation for scoring
      const itemForScoring = {
        id: projectItem.id,
        content: projectItem.content,
        fields: { ...projectItem.fields, ...fieldUpdates } // Include both existing and new values
      };

      // Recalculate derived scores based on the updates
      console.log('  Calculating derived scores...');
      const scores = scoringOps.computeAllScores(itemForScoring);

      // Add computed scores to the field updates
      Object.assign(fieldUpdates, scores);

      // Validate field mappings
      console.log('  Validating field mappings...');
      const validation = mappingOps.validateMappings(fieldUpdates, schema);
      if (!validation.valid) {
        console.error(`  Field mapping validation failed for item ${projectItem.id}:`);
        validation.errors.forEach(err => console.error(`    - ${err}`));
        continue; // Skip this item
      }

      if (DRY_RUN) {
        console.log(`  DRY RUN: Would apply ${Object.keys(fieldUpdates).length} field updates to item ${projectItem.id}:`);
        for (const [field, value] of Object.entries(fieldUpdates)) {
          console.log(`    - ${field}: ${JSON.stringify(value)}`);
        }
      } else {
        console.log(`  Applying ${Object.keys(fieldUpdates).length} field updates to item ${projectItem.id}...`);

        // Prepare updates for the API
        const updates = [{
          itemId: projectItem.id,
          fieldUpdates: prepareFieldUpdatesForApi(fieldUpdates)
        }];

        // Execute the updates
        const results = await itemOps.batchUpdateItems(projectId, updates);

        // Process results
        for (const result of results) {
          for (const update of result.updates) {
            if (update.success) {
              console.log(`    ✓ Updated ${update.field}`);
            } else {
              console.error(`    ✗ Failed to update ${update.field}: ${update.error}`);
            }
          }
        }
      }
    }

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      workflowRunId: workflowRun.id,
      workflowName: workflowRun.name,
      conclusion: workflowRun.conclusion,
      associatedItems: associatedItems.map(item => ({
        id: item.id,
        content: item.content
      })),
      artifactsProcessed: Object.keys(parsedArtifacts).length,
      artifactsDownloaded: Object.keys(artifacts).length,
      fieldUpdatesApplied: !DRY_RUN ? Object.keys(artifacts).length : 0, // Simplified count
      dryRun: DRY_RUN,
      maxFixScope: MAX_FIX_SCOPE
    };

    // Write report
    const reportPath = path.join(outputDir, `workflow-${workflowRun.id}-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\nReport saved to: ${reportPath}`);

    // Exit code based on success
    process.exit(0);
  } catch (error) {
    console.error('\nUnexpected error occurred:', error.message);
    console.error(error.stack);

    // Write error to file
    const errorPath = path.join(outputDir, `error-${Date.now()}.log`);
    fs.writeFileSync(errorPath, `Error: ${error.message}\nStack: ${error.stack}\n\nTimestamp: ${new Date().toISOString()}`);

    process.exit(1);
  }
}

/**
 * Find project items associated with a workflow run
 */
async function findAssociatedProjectItems(workflowRun, itemOps, projectId) {
  const allItems = await itemOps.findAllProjectItems(projectId);
  const associatedItems = [];

  // First, try to find items based on workflow run's pull requests
  if (workflowRun.pull_requests && workflowRun.pull_requests.length > 0) {
    for (const pr of workflowRun.pull_requests) {
      const item = allItems.find(i => 
        i.content && i.content.number === pr.number && 
        (i.content.type === 'PullRequest' || i.content.url?.includes(`/pull/${pr.number}`))
      );
      if (item) {
        associatedItems.push(item);
      }
    }
  }

  // If no items found via PRs, try to find by commit SHA
  if (associatedItems.length === 0) {
    const commitSha = workflowRun.head_sha;
    // In a real implementation, we'd need to connect commits to issues/PRs
    // This is simplified - we'll match any item that might be related to the commit
    // For now, we'll skip this complex lookup and return empty array
    // In a real scenario, you'd need to query commits, match to issues, and then to project items
  }

  return associatedItems;
}

/**
 * Prepare field updates for GitHub API
 */
function prepareFieldUpdatesForApi(fieldUpdates) {
  const apiUpdates = {};

  for (const [fieldName, value] of Object.entries(fieldUpdates)) {
    // Determine the appropriate value type for the API
    let valueType = 'text';
    
    // Try to infer type based on field name conventions
    if (fieldName.toLowerCase().includes('select') || fieldName.toLowerCase().includes('option')) {
      valueType = 'singleSelect';
    } else if (fieldName.toLowerCase().includes('number') || fieldName.toLowerCase().includes('score')) {
      valueType = 'number';
    } else if (fieldName.toLowerCase().includes('date')) {
      valueType = 'date';
    } else if (fieldName.toLowerCase().includes('complete') || fieldName.toLowerCase().includes('required')) {
      valueType = 'checkbox';
    }

    apiUpdates[fieldName] = {
      value: value,
      valueType: valueType
    };
  }

  return apiUpdates;
}

// Run the main function
main();