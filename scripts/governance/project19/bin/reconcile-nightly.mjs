#!/usr/bin/env node

/**
 * Reconcile Nightly Script
 * Runs nightly to recompute derived fields and fix drift
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
const MAX_FIX_SCOPE = parseInt(process.env.MAX_FIX_SCOPE) || 500;
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
const projectId = args.find(arg => arg.startsWith('--project-id='))?.split('=')[1];

if (!projectId) {
  console.error('Project ID is required. Use --project-id=<project-id>');
  process.exit(1);
}

// Create output directory
const outputDir = path.join(process.cwd(), 'artifacts', 'project19', 'nightly');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  console.log(`Starting nightly reconciliation...`);
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

    // Get all project items
    console.log('  Fetching all project items...');
    const allItemsRaw = await itemOps.findAllProjectItems(projectId);
    console.log(`  Found ${allItemsRaw.length} items in project`);

    // Transform raw items to standardized format
    const allItems = allItemsRaw.map(item => itemOps.transformItemData(item));
    console.log('  Items transformed to standardized format');

    // Save initial state for comparison
    const initialState = allItems.map(item => ({ ...item }));

    // Process each item to compute derived fields and check for drift
    console.log('  Computing derived scores and checking for drift...');
    
    const updates = [];
    let totalUpdates = 0;
    
    for (const item of allItems) {
      // Compute all derived scores
      const newScores = scoringOps.computeAllScores(item);
      
      // Check if any computed scores differ from current values
      let needsUpdate = false;
      const fieldUpdates = {};

      // Compare each computed field
      for (const [scoreField, newScoreValue] of Object.entries(newScores)) {
        const currentScoreValue = item.fields[scoreField];
        
        // For scores, we'll round to 1 decimal place to avoid floating point precision issues
        const roundedNewValue = Math.round(newScoreValue * 10) / 10;
        const roundedCurrentValue = currentScoreValue !== undefined ? Math.round(currentScoreValue * 10) / 10 : undefined;
        
        if (roundedNewValue !== roundedCurrentValue) {
          fieldUpdates[scoreField] = roundedNewValue;
          needsUpdate = true;
        }
      }

      // Map based on current item state (labels, milestone, etc.)
      const currentState = mappingOps.mapEventToFields({ payload: { issue: item.content } });
      
      // Update with current state mappings
      for (const [field, value] of Object.entries(currentState)) {
        if (item.fields[field] !== value) {
          fieldUpdates[field] = value;
          needsUpdate = true;
        }
      }

      // Apply cross-field mappings
      const crossMapped = mappingOps.applyCrossFieldMapping({ ...item.fields, ...fieldUpdates });
      for (const [field, value] of Object.entries(crossMapped)) {
        if (fieldUpdates[field] !== value) {
          fieldUpdates[field] = value;
          needsUpdate = true;
        }
      }

      // Check for drift corrections
      const driftCorrections = checkForDriftCorrections(item);
      for (const [field, value] of Object.entries(driftCorrections)) {
        if (item.fields[field] !== value && fieldUpdates[field] !== value) {
          fieldUpdates[field] = value;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        // Add to updates list
        updates.push({
          itemId: item.id,
          fieldUpdates: prepareFieldUpdatesForApi(fieldUpdates)
        });
        
        totalUpdates += Object.keys(fieldUpdates).length;
        
        if (DRY_RUN) {
          console.log(`  Would update item ${item.id} (${item.content?.title}):`);
          for (const [field, value] of Object.entries(fieldUpdates)) {
            console.log(`    - ${field}: ${item.fields[field]} → ${value}`);
          }
        }
      }
    }

    console.log(`  Total planned updates: ${totalUpdates} across ${updates.length} items`);

    // Check if we're within the max fix scope
    if (totalUpdates > MAX_FIX_SCOPE) {
      console.error(`Too many field updates (${totalUpdates}) for the allowed scope (${MAX_FIX_SCOPE})`);
      console.error(`Either increase MAX_FIX_SCOPE or investigate why so many updates are needed`);
      
      // Write a report about the excess
      const excessReport = {
        timestamp: new Date().toISOString(),
        excessCount: totalUpdates - MAX_FIX_SCOPE,
        totalUpdates: totalUpdates,
        maxFixScope: MAX_FIX_SCOPE,
        itemCount: updates.length,
        itemsAffected: updates.map(update => update.itemId)
      };
      
      const excessReportPath = path.join(outputDir, 'excess-updates.json');
      fs.writeFileSync(excessReportPath, JSON.stringify(excessReport, null, 2));
      
      process.exit(1);
    }

    if (DRY_RUN) {
      if (totalUpdates > 0) {
        console.log(`\nDRY RUN: ${totalUpdates} field updates planned, but none were applied.`);
        console.log(`To apply these changes, run with DRY_RUN=false`);
      } else {
        console.log(`\nDRY RUN: No changes needed. All items are already in the correct state.`);
      }
    } else {
      console.log(`  Applying ${totalUpdates} field updates across ${updates.length} items...`);
      
      if (updates.length > 0) {
        // Execute the batch updates
        const results = await itemOps.batchUpdateItems(projectId, updates);
        
        // Process results
        let successfulUpdates = 0;
        let failedUpdates = 0;
        const errors = [];
        
        for (const result of results) {
          for (const update of result.updates) {
            if (update.success) {
              successfulUpdates++;
            } else {
              failedUpdates++;
              errors.push(`Item ${result.itemId} - ${update.field}: ${update.error}`);
            }
          }
        }
        
        console.log(`  Successfully updated: ${successfulUpdates}`);
        console.log(`  Failed updates: ${failedUpdates}`);
        if (failedUpdates > 0) {
          console.error('  Failed update details:');
          errors.forEach(error => console.error(`    ${error}`));
        }
      }
    }

    // Compute current state for final report
    const postUpdateItems = DRY_RUN ? initialState : await itemOps.findAllProjectItems(projectId);
    const postUpdateTransformed = postUpdateItems.map(item => itemOps.transformItemData(item));

    // Generate drift report
    const driftReport = itemOps.createChangeSummary(initialState, postUpdateTransformed);

    // Calculate additional metrics
    const metrics = calculateMetrics(postUpdateTransformed);

    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      schemaFile: PROJECT19_SCHEMA_PATH,
      projectId: projectId,
      dryRun: DRY_RUN,
      maxFixScope: MAX_FIX_SCOPE,
      executionSummary: {
        itemsProcessed: allItems.length,
        totalPlannedUpdates: totalUpdates,
        updatesApplied: DRY_RUN ? 0 : totalUpdates,
        itemsUpdated: DRY_RUN ? 0 : updates.length,
        itemsNotUpdated: allItems.length - (DRY_RUN ? 0 : updates.length),
        errors: DRY_RUN ? 0 : (updates.length > 0 ? 
          (await itemOps.batchUpdateItems(projectId, updates))
            .flatMap(result => result.updates.filter(update => !update.success)).length : 0)
      },
      driftAnalysis: driftReport,
      computedMetrics: metrics,
      policyCompliance: checkPolicyCompliance(postUpdateTransformed),
      recommendations: generateRecommendations(driftReport, metrics)
    };

    // Write detailed report as JSON
    const reportPath = path.join(outputDir, `reconciliation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Write summary as markdown
    const summaryPath = path.join(outputDir, `summary-${Date.now()}.md`);
    const summaryMarkdown = generateSummaryMarkdown(report);
    fs.writeFileSync(summaryPath, summaryMarkdown);

    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log('Summary saved to:', summaryPath);

    // Print summary to console
    console.log('\n' + '='.repeat(60));
    console.log('RECONCILIATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${DRY_RUN ? 'DRY RUN' : report.executionSummary.errors > 0 ? 'ERRORS' : 'SUCCESS'}`);
    console.log(`Items Processed: ${report.executionSummary.itemsProcessed}`);
    console.log(`Updates Applied: ${report.executionSummary.updatesApplied}`);
    console.log(`Errors: ${report.executionSummary.errors}`);

    if (report.executionSummary.errors > 0) {
      console.log('\nErrors occurred during reconciliation.');
      process.exit(2); // Error exit code
    } else if (DRY_RUN && report.executionSummary.totalPlannedUpdates > 0) {
      console.log(`\nNote: This was a dry run. No actual changes were made.`);
      console.log(`To apply these changes, run with DRY_RUN=false`);
    } else {
      console.log(`\nNightly reconciliation completed successfully.`);
    }

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
 * Check for specific drift corrections
 */
function checkForDriftCorrections(item) {
  const corrections = {};

  // Example drift corrections
  // If an item has Release Blocker = Yes but Priority < P1, correct it
  if (item.fields['Release Blocker'] === 'Yes' && 
      !['P0', 'P1'].includes(item.fields['Priority'])) {
    corrections['Priority'] = 'P1';  // Elevate priority
  }

  // If Evidence Complete = Yes but Evidence Required = No, this is inconsistent
  if (item.fields['Evidence Complete'] === 'Yes' && 
      item.fields['Evidence Required'] === 'No') {
    corrections['Evidence Required'] = 'Yes';  // Correct the requirement
  }

  // If Status = Done but Gate Status != Approved for critical gates
  if (item.fields['Status'] === 'Done' && 
      ['GA', 'Security', 'Compliance'].includes(item.fields['Governance Gate']) &&
      item.fields['Gate Status'] !== 'Approved') {
    corrections['Gate Status'] = 'Approved';  // Approve gate if item is marked done
  }

  // Apply fixes for impossible combinations
  if (item.fields['Governance Gate'] === 'GA' && 
      item.fields['Release'] !== 'GA' && 
      item.fields['Release'] !== undefined) {
    corrections['Release'] = 'GA';  // If item is at GA gate, it should be in GA release
  }

  return corrections;
}

/**
 * Calculate metrics about the project state
 */
function calculateMetrics(items) {
  const metrics = {
    totalCount: items.length,
    byPhase: {},
    byPriority: {},
    byStatus: {},
    byRelease: {},
    byGate: {},
    byAutomation: {},
    gaReadiness: 0,
    avgWsJf: 0,
    avgTruePriority: 0,
    criticalBlockers: 0,
    overdueItems: 0,
    evidenceCompleteness: 0
  };

  let totalWsJf = 0;
  let totalTruePriority = 0;
  let completedEvidenceCount = 0;
  let totalEvidenceCount = 0;

  for (const item of items) {
    // Count by fields
    incrementCount(metrics.byPhase, item.fields['Phase']);
    incrementCount(metrics.byPriority, item.fields['Priority']);
    incrementCount(metrics.byStatus, item.fields['Status']);
    incrementCount(metrics.byRelease, item.fields['Release']);
    incrementCount(metrics.byGate, item.fields['Governance Gate']);
    incrementCount(metrics.byAutomation, item.fields['Automation Eligibility']);

    // Calculate averages
    if (item.fields['WSJF Score'] !== undefined) {
      totalWsJf += item.fields['WSJF Score'];
    }
    if (item.fields['True Priority'] !== undefined) {
      totalTruePriority += item.fields['True Priority'];
    }

    // Count critical blockers
    if (item.fields['Release Blocker'] === 'Yes' || 
        (item.fields['Priority'] === 'P0' && item.fields['Status'] !== 'Done')) {
      metrics.criticalBlockers++;
    }

    // Count overdue items
    if (item.fields['Planned Finish'] && new Date(item.fields['Planned Finish']) < new Date() && item.fields['Status'] !== 'Done') {
      metrics.overdueItems++;
    }

    // Calculate evidence completeness
    if (item.fields['Evidence Required'] === 'Yes') {
      totalEvidenceCount++;
      if (item.fields['Evidence Complete'] === 'Yes') {
        completedEvidenceCount++;
      }
    }
  }

  metrics.avgWsJf = totalWsJf / items.length || 0;
  metrics.avgTruePriority = totalTruePriority / items.length || 0;
  metrics.evidenceCompleteness = totalEvidenceCount > 0 ? (completedEvidenceCount / totalEvidenceCount) * 100 : 0;

  return metrics;
}

/**
 * Helper function to increment count in object
 */
function incrementCount(obj, key) {
  if (key !== undefined && key !== null) {
    obj[key] = (obj[key] || 0) + 1;
  }
}

/**
 * Check policy compliance
 */
function checkPolicyCompliance(items) {
  const compliance = {
    totalIssues: items.length,
    policyViolations: 0,
    violationTypes: {},
    complianceRate: 0
  };

  for (const item of items) {
    // Example policy checks
    const violations = [];

    // P0 items should not have release later than Beta
    if (item.fields['Priority'] === 'P0' && ['v1.1', 'v2.0+', 'GA'].includes(item.fields['Release'])) {
      violations.push('P0 items cannot have release later than Beta');
    }

    // GA items should have evidence required
    if (item.fields['Release'] === 'GA' && item.fields['Evidence Required'] !== 'Yes') {
      violations.push('GA items must have evidence required');
    }

    // Governance Gate alignment
    if (item.fields['Governance Gate'] === 'GA' && item.fields['Evidence Complete'] !== 'Yes') {
      violations.push('GA gate items must have evidence complete');
    }

    if (violations.length > 0) {
      compliance.policyViolations++;
      for (const violation of violations) {
        compliance.violationTypes[violation] = (compliance.violationTypes[violation] || 0) + 1;
      }
    }
  }

  compliance.complianceRate = ((compliance.totalIssues - compliance.policyViolations) / compliance.totalIssues) * 100 || 0;
  return compliance;
}

/**
 * Generate recommendations
 */
function generateRecommendations(driftReport, metrics) {
  const recommendations = [];

  if (metrics.criticalBlockers > 0) {
    recommendations.push(`Address ${metrics.criticalBlockers} critical blockers`);
  }

  if (metrics.overdueItems > 0) {
    recommendations.push(`Review ${metrics.overdueItems} overdue items`);
  }

  if (metrics.evidenceCompleteness < 80) {
    recommendations.push(`Improve evidence completeness (${metrics.evidenceCompleteness.toFixed(1)}%)`);
  }

  if (metrics.complianceRate < 95) {
    recommendations.push(`Address policy violations (compliance: ${metrics.complianceRate.toFixed(1)}%)`);
  }

  if (driftReport.created.length > 0) {
    recommendations.push(`Review ${driftReport.created.length} newly created items`);
  }

  if (driftReport.updated.length > 0) {
    recommendations.push(`Review ${driftReport.updated.length} updated items for unexpected changes`);
  }

  return recommendations;
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
 * Generate summary markdown
 */
function generateSummaryMarkdown(report) {
  const { executionSummary, driftAnalysis, computedMetrics, policyCompliance } = report;
  
  return `# Project 19 Nightly Reconciliation Report

**Date:** ${report.timestamp}

## Execution Summary
- **Items Processed:** ${executionSummary.itemsProcessed}
- **Updates Applied:** ${executionSummary.updatesApplied}
- **Items Updated:** ${executionSummary.itemsUpdated}
- **Errors:** ${executionSummary.errors}
- **Dry Run:** ${report.dryRun}

## Metrics Overview
- **Total Items:** ${computedMetrics.totalCount}
- **Critical Blockers:** ${computedMetrics.criticalBlockers}
- **Overdue Items:** ${computedMetrics.overdueItems}
- **Average WSJF Score:** ${computedMetrics.avgWsJf.toFixed(2)}
- **Average True Priority:** ${computedMetrics.avgTruePriority.toFixed(2)}
- **Evidence Completeness:** ${computedMetrics.evidenceCompleteness.toFixed(1)}%

## Policy Compliance
- **Compliance Rate:** ${policyCompliance.complianceRate.toFixed(1)}%
- **Policy Violations:** ${policyCompliance.policyViolations}
- **Compliance Issues:** ${Object.keys(policyCompliance.violationTypes).length}

## Drift Analysis
- **Items Created:** ${driftAnalysis.created.length}
- **Items Updated:** ${driftAnalysis.updated.length}
- **Items Unchanged:** ${driftAnalysis.unchanged.length}
- **Items Deleted:** ${driftAnalysis.deleted.length}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Status
${executionSummary.errors > 0 ? ':x: FAILED' : report.dryRun ? ':warning: DRY RUN' : ':white_check_mark: SUCCESS'}
`;
}

// Run the main function
main();