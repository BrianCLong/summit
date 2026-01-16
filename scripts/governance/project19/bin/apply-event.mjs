#!/usr/bin/env node

/**
 * Apply Event Script
 * Processes GitHub events (issues/PRs) and updates corresponding Project fields
 */

import fs from 'fs';
import path from 'path';
import ItemOperations from '../lib/item-ops.mjs';
import MappingOperations from '../lib/mapping.mjs';
import ScoringOperations from '../lib/scoring.mjs';

// Load environment variables
const PROJECT19_SCHEMA_PATH = process.env.PROJECT19_SCHEMA || 'scripts/config/project19-field-schema.json';
const LABEL_MAP_PATH = process.env.LABEL_MAP || 'scripts/config/project19-label-map.json';
const SCORE_POLICY_PATH = process.env.SCORE_POLICY || 'scripts/config/project19-score-policy.json';
const DRY_RUN = process.env.DRY_RUN === 'false' ? false : true; // Default to true if not set
const MAX_FIX_SCOPE = parseInt(process.env.MAX_FIX_SCOPE) || 200;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Validate inputs
if (!GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

if (!fs.existsSync(PROJECT19_SCHEMA_PATH)) {
  console.error(`Schema file not found: ${PROJECT19_SCHEMA_PATH}`);
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
const outputDir = path.join(process.cwd(), 'artifacts', 'project19', 'event-sync');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  console.log(`Starting event processing...`);
  console.log(`  Event Path: ${eventPath || 'Using GITHUB_EVENT_PATH'}`);
  console.log(`  Schema: ${PROJECT19_SCHEMA_PATH}`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Dry Run: ${DRY_RUN}`);
  console.log(`  Max Fix Scope: ${MAX_FIX_SCOPE}`);

  try {
    // Load configurations
    const schema = JSON.parse(fs.readFileSync(PROJECT19_SCHEMA_PATH, 'utf8'));
    const mappingOps = new MappingOperations(LABEL_MAP_PATH, null);
    const scoringOps = new ScoringOperations(SCORE_POLICY_PATH);
    
    // Initialize item operations
    const itemOps = new ItemOperations(GITHUB_TOKEN);

    // Get the GitHub event
    let eventPayload = {};
    if (eventPath && fs.existsSync(eventPath)) {
      eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    } else if (process.env.GITHUB_EVENT_PATH) {
      eventPayload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    } else {
      // Fallback: try to read from GitHub context
      console.log('No event file provided, using a sample event...');
      // For demo purposes, we'll create a sample event
      eventPayload = {
        action: 'labeled',
        issue: {
          id: '12345',
          number: 123,
          title: 'Sample issue',
          labels: [{ name: 'security' }, { name: 'p0' }],
          milestone: { title: 'GA' },
          assignees: [{ login: 'jules-bot' }]
        }
      };
    }

    console.log(`  Event Action: ${eventPayload.action}`);
    console.log(`  Event Type: ${eventPayload.issue ? 'Issue' : eventPayload.pull_request ? 'Pull Request' : 'Other'}`);

    // Determine if this is an issue or PR event
    const target = eventPayload.issue || eventPayload.pull_request;
    if (!target) {
      console.log('No issue or pull request found in event. Nothing to process.');
      return;
    }

    const issueNumber = target.number;
    console.log(`  Processing Issue/PR #${issueNumber}`);

    // Find the corresponding project item(s)
    console.log('  Looking for project item...');
    const allItems = await itemOps.findAllProjectItems(projectId);
    const projectItem = allItems.find(item => {
      const content = item.content;
      return content && content.number === issueNumber;
    });

    if (!projectItem) {
      console.log(`  Project item not found for Issue/PR #${issueNumber}`);
      // Optionally add the issue to the project if it doesn't exist
      // For now, we'll skip processing
      console.log(`  Skipping: No project item found for this issue.`);
      return;
    }

    console.log(`  Found project item: ${projectItem.id}`);

    // Map the event to field updates
    console.log('  Mapping event to field updates...');
    const fieldUpdates = mappingOps.mapEventToFields(eventPayload);
    
    console.log('  Field updates determined:', Object.keys(fieldUpdates));

    // Recalculate derived scores based on the updates
    console.log('  Calculating derived scores...');
    const itemForScoring = {
      id: projectItem.id,
      content: target,
      fields: { ...projectItem.fields, ...fieldUpdates } // Include both existing and new values
    };
    
    const scores = scoringOps.computeAllScores(itemForScoring);
    
    // Add computed scores to the field updates
    Object.assign(fieldUpdates, scores);

    // Validate field mappings
    console.log('  Validating field mappings...');
    const validation = mappingOps.validateMappings(fieldUpdates, schema);
    if (!validation.valid) {
      console.error('Field mapping validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      return;
    }

    // Prepare updates list for batch processing
    const updates = [{
      itemId: projectItem.id,
      fieldUpdates: prepareFieldUpdatesForApi(fieldUpdates)
    }];

    // Check if we're within the max fix scope
    const totalUpdates = Object.keys(fieldUpdates).length;
    if (totalUpdates > MAX_FIX_SCOPE) {
      console.error(`Too many field updates (${totalUpdates}) for the allowed scope (${MAX_FIX_SCOPE})`);
      return;
    }

    if (DRY_RUN) {
      console.log(`\nDRY RUN: Would apply ${totalUpdates} field updates:`);
      for (const [field, value] of Object.entries(fieldUpdates)) {
        console.log(`  - ${field}: ${JSON.stringify(value)}`);
      }
      console.log(`\nNo actual changes made.`);
    } else {
      console.log(`  Applying ${totalUpdates} field updates...`);
      
      // Execute the updates
      const results = await itemOps.batchUpdateItems(projectId, updates);
      
      // Process results
      for (const result of results) {
        for (const update of result.updates) {
          if (update.success) {
            console.log(`  ✓ Updated ${update.field}`);
          } else {
            console.error(`  ✗ Failed to update ${update.field}: ${update.error}`);
          }
        }
      }
    }

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      eventId: eventPayload.action,
      eventAction: eventPayload.action,
      issueNumber: issueNumber,
      projectItemId: projectItem.id,
      fieldUpdates: fieldUpdates,
      dryRun: DRY_RUN,
      maxFixScope: MAX_FIX_SCOPE,
      totalUpdates: totalUpdates,
      validationErrors: validation.errors
    };

    // Write report
    const reportPath = path.join(outputDir, `event-${issueNumber}-${Date.now()}.json`);
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

/**
 * Generate summary from the report
 */
function generateSummary(report) {
  return {
    eventId: report.eventId,
    issueNumber: report.issueNumber,
    fieldUpdatesCount: report.totalUpdates,
    dryRun: report.dryRun,
    success: report.validationErrors.length === 0
  };
}

// Run the main function
main();