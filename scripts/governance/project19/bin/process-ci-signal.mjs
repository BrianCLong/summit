#!/usr/bin/env node

/**
 * Project 19 CI Signal Integrator
 * Processes CI artifacts and updates Project fields
 */

import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';

// Load configurations
const WORKFLOW_MAP_PATH = process.env.WORKFLOW_MAP_PATH || 'scripts/config/project19-workflow-map.json';
const FIELD_MAP_PATH = process.env.FIELD_MAP_PATH || 'scripts/config/project19-field-map.json';

let workflowMap = {};
let fieldMap = {};

try {
  if (fs.existsSync(WORKFLOW_MAP_PATH)) {
    workflowMap = JSON.parse(fs.readFileSync(WORKFLOW_MAP_PATH, 'utf8'));
  } else {
    console.warn(`Workflow map not found at ${WORKFLOW_MAP_PATH}, using empty map`);
  }
  
  if (fs.existsSync(FIELD_MAP_PATH)) {
    fieldMap = JSON.parse(fs.readFileSync(FIELD_MAP_PATH, 'utf8'));
  } else {
    console.warn(`Field map not found at ${FIELD_MAP_PATH}, using empty map`);
  }
} catch (error) {
  console.error('Error loading configuration:', error.message);
  process.exit(1);
}

// Initialize Octokit for artifact downloads
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'project19-ci-integrator'
});

/**
 * Process workflow run completion and update fields
 */
async function processWorkflowRun(workflowRun) {
  const workflowName = workflowRun.name;
  
  // Find matching workflow config
  const workflowConfig = workflowMap.workflows.find(config => 
    workflowName.toLowerCase().includes(config.name_match.toLowerCase())
  );
  
  if (!workflowConfig) {
    console.log(`No matching workflow config found for: ${workflowName}`);
    return { updates: {}, affectedItems: [] };
  }
  
  console.log(`Processing workflow: ${workflowName} (matched config: ${workflowConfig.name_match})`);
  
  // Download artifacts for this run
  const artifacts = await downloadWorkflowArtifacts(workflowRun);
  
  // Process artifacts according to the configuration
  const fieldUpdates = await processArtifacts(artifacts, workflowConfig);
  
  // Find project items associated with this workflow run
  const associatedItems = await findAssociatedProjectItems(workflowRun);
  
  const results = [];
  for (const item of associatedItems) {
    results.push({
      itemId: item.projectItemId,
      updates: fieldUpdates,
      workflowRunId: workflowRun.id
    });
  }
  
  return {
    updates: results,
    affectedItems: associatedItems.map(i => i.projectItemId)
  };
}

/**
 * Download workflow artifacts
 */
async function downloadWorkflowArtifacts(workflowRun) {
  const owner = workflowRun.repository.owner.login;
  const repo = workflowRun.repository.name;
  const runId = workflowRun.id;
  
  try {
    const { data: artifactsList } = await octokit.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: runId
    });
    
    const artifacts = {};
    
    for (const artifact of artifactsList.artifacts) {
      // Check if artifact should be downloaded based on workflow config
      const shouldDownload = 
        workflowMap.workflows.some(config => 
          workflowRun.name.toLowerCase().includes(config.name_match.toLowerCase()) &&
          (config.required_artifacts || []).concat(config.optional_artifacts || [])
           .some(name => name === artifact.name)
        );
      
      if (shouldDownload) {
        try {
          const response = await octokit.actions.downloadArtifact({
            owner,
            repo,
            artifact_id: artifact.id,
            archive_format: 'zip'
          });
          
          // Create a temporary directory to extract the artifact
          const tempDir = path.join('/tmp', `artifact_${artifact.id}_${Date.now()}`);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          // Extract the artifact (in a real implementation, use proper ZIP extraction)
          // For now, we'll create a mock extraction based on the artifact name
          const extractedPath = path.join(tempDir, artifact.name);
          
          // Simulate extracting common known artifacts
          if (artifact.name === 'stamp.json' || artifact.name.includes('stamp')) {
            const stampContent = JSON.stringify({
              status: workflowRun.conclusion === 'success' ? 'Green' : 'Failing',
              determinism_risk: 'None', // Would come from actual analysis
              policy_version: process.env.POLICY_VERSION || 'v2026.01.15',
              evidence_bundle_id: `bundle-${Date.now()}`, // Would come from actual evidence
              evidence_complete: true // Would come from actual evidence analysis
            });
            fs.writeFileSync(path.join(tempDir, 'stamp.json'), stampContent);
          }
          
          // Read all JSON files from extracted directory
          const files = fs.readdirSync(tempDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(tempDir, file);
              const content = fs.readFileSync(filePath, 'utf8');
              artifacts[file.replace('.json', '')] = JSON.parse(content);
            }
          }
          
        } catch (error) {
          console.warn(`Could not download artifact ${artifact.name}:`, error.message);
        }
      }
    }
    
    return artifacts;
  } catch (error) {
    console.error('Error downloading workflow artifacts:', error.message);
    return {};
  }
}

/**
 * Process artifacts according to workflow configuration
 */
async function processArtifacts(artifacts, workflowConfig) {
  const updates = {};
  
  // Process each artifact type according to the mapping
  for (const [artifactName, artifactData] of Object.entries(artifacts)) {
    const processingConfig = workflowMap.artifact_processing[`${artifactName}.json`];
    
    if (processingConfig && processingConfig.field_mapping) {
      for (const [jsonDataField, fieldToUpdate] of Object.entries(processingConfig.field_mapping)) {
        const value = artifactData[jsonDataField];
        if (value !== undefined) {
          updates[fieldToUpdate] = value;
        }
      }
    }
  }
  
  // Apply hard-coded defaults based on workflow conclusion
  const ciStatus = workflowConfig.workflow_conclusion === 'success' ? 'Green' : 'Failing';
  updates['CI Status Snapshot'] = ciStatus;
  updates['Artifact Produced'] = Object.keys(artifacts).length > 0;
  
  return updates;
}

/**
 * Find project items associated with workflow run
 */
async function findAssociatedProjectItems(workflowRun) {
  // In a real implementation, we'd need either:
  // 1. A mapping between workflow runs and project items
  // 2. Extract issue/PR numbers from workflow run context
  // 3. Use commit SHAs to find related issues
  
  // For now, simulate by looking at PRs if any
  const associatedItems = [];
  
  if (workflowRun.pull_requests && workflowRun.pull_requests.length > 0) {
    for (const pr of workflowRun.pull_requests) {
      // In a real implementation, this would query the project to find the item
      // associated with this PR. We'll simulate returning an item.
      associatedItems.push({
        projectItemId: `PR-${pr.number}`,
        content: pr
      });
    }
  } else {
    // Try to extract issue numbers from commit messages or branch names
    // This is a simplified approach
    const branch = workflowRun.head_branch;
    const match = branch.match(/issue-(\d+)/i) || branch.match(/#(\d+)/);
    if (match) {
      associatedItems.push({
        projectItemId: `ISSUE-${match[1]}`,
        content: { number: match[1] }
      });
    }
  }
  
  console.log(`Found ${associatedItems.length} associated project items`);
  return associatedItems;
}

/**
 * Main function to handle CI signal processing
 */
async function main() {
  const args = process.argv.slice(2);
  const workflowRunPath = args[0];
  
  if (args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node ci-integrator.mjs [workflow_run_json_path]');
    console.log('If no path provided, uses GITHUB_EVENT_PATH environment variable');
    process.exit(0);
  }
  
  let workflowRun;
  
  if (workflowRunPath && fs.existsSync(workflowRunPath)) {
    try {
      workflowRun = JSON.parse(fs.readFileSync(workflowRunPath, 'utf8'));
    } catch (error) {
      console.error(`Error reading workflow run from ${workflowRunPath}:`, error.message);
      process.exit(1);
    }
  } else if (process.env.GITHUB_EVENT_PATH) {
    try {
      const eventPayload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      if (eventPayload.workflow_run) {
        workflowRun = eventPayload.workflow_run;
      } else {
        console.error('No workflow_run found in event payload');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error reading workflow run from GITHUB_EVENT_PATH:', error.message);
      process.exit(1);
    }
  } else {
    // For testing, create a sample workflow run
    console.log('No workflow run provided, using sample data...');
    workflowRun = {
      id: 123456,
      name: 'CI Core',
      conclusion: 'success',
      head_branch: 'feature/issue-123-add-authentication',
      repository: {
        owner: { login: 'BrianCLong' },
        name: 'summit'
      },
      pull_requests: [
        { number: 123, title: 'Add authentication feature', url: 'https://github.com/BrianCLong/summit/pull/123' }
      ]
    };
  }
  
  try {
    console.log('Processing CI signals for workflow run:', workflowRun.id, `'${workflowRun.name}'`);
    
    const { updates, affectedItems } = await processWorkflowRun(workflowRun);
    
    console.log('Field updates computed:');
    console.log(JSON.stringify(updates, null, 2));
    
    console.log('Affected items:', affectedItems);
    
    // In a real implementation, this would update the project items via GraphQL
    // For now, we'll just output the results
    
    const result = {
      workflowRunId: workflowRun.id,
      workflowName: workflowRun.name,
      conclusion: workflowRun.conclusion,
      fieldUpdates: updates,
      affectedItems: affectedItems,
      timestamp: new Date().toISOString(),
      dryRun: process.env.DRY_RUN === 'true'
    };
    
    // Write to output file for workflow consumption
    const outputDir = path.join(process.cwd(), 'artifacts', 'project19', 'ci-signals');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `ci-signal-${workflowRun.id}-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Results saved to: ${outputFile}`);
    
    // Exit with success code
    process.exit(0);
  } catch (error) {
    console.error('Error processing CI signals:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

export default processWorkflowRun;