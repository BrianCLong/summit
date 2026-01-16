#!/usr/bin/env node

/**
 * Project 19 Event Processor
 * Processes GitHub events and updates corresponding Project 19 fields
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

// Load configurations
const LABEL_MAP_PATH = process.env.LABEL_MAP_PATH || 'scripts/config/project19-label-map.json';
const FIELD_MAP_PATH = process.env.FIELD_MAP_PATH || 'scripts/config/project19-field-map.json';

// Load mapping configurations
let labelMap = {};
let fieldMap = {};

try {
  if (fs.existsSync(LABEL_MAP_PATH)) {
    labelMap = JSON.parse(fs.readFileSync(LABEL_MAP_PATH, 'utf8'));
  } else {
    console.warn(`Label map not found at ${LABEL_MAP_PATH}, using empty map`);
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

/**
 * Process GitHub event and determine field updates
 */
function processGitHubEvent(eventType, payload) {
  const updates = {};
  
  // Determine content type and extract common fields
  let content = null;
  let number = null;
  
  if (eventType === 'issues' && payload.issue) {
    content = payload.issue;
    number = payload.issue.number;
  } else if (eventType === 'pull_request' && payload.pull_request) {
    content = payload.pull_request;
    number = payload.pull_request.number;
  } else {
    console.log('Unsupported event type or missing content');
    return { updates: {}, issueNumber: null };
  }
  
  // Process labels
  if (content.labels) {
    const labels = content.labels.map(l => l.name.toLowerCase());
    const labelUpdates = processLabels(labels);
    Object.assign(updates, labelUpdates);
  }
  
  // Process milestone
  if (content.milestone) {
    const milestoneUpdates = processMilestone(content.milestone.title);
    Object.assign(updates, milestoneUpdates);
  }
  
  // Process assignees
  if (content.assignees) {
    const assigneeUpdates = processAssignees(content.assignees);
    Object.assign(updates, assigneeUpdates);
  }
  
  // Process title for keywords
  if (content.title) {
    const titleUpdates = processTitleKeywords(content.title);
    Object.assign(updates, titleUpdates);
  }
  
  return { updates, issueNumber: number };
}

/**
 * Process labels and map to fields
 */
function processLabels(labels) {
  const updates = {};
  
  // Process delivery class mapping
  for (const [label, fieldVal] of Object.entries(labelMap.delivery_class || {})) {
    if (labels.includes(label)) {
      updates['Delivery Class'] = fieldVal;
    }
  }
  
  // Process governance gate mapping
  for (const [label, fieldVal] of Object.entries(labelMap.governance_gate || {})) {
    if (labels.includes(label)) {
      updates['Governance Gate'] = fieldVal;
    }
  }
  
  // Process evidence required mapping
  for (const [label, fieldVal] of Object.entries(labelMap.evidence_required || {})) {
    if (labels.includes(label)) {
      updates['Evidence Required'] = fieldVal;
    }
  }
  
  // Process automation eligibility mapping
  for (const [label, fieldVal] of Object.entries(labelMap.automation_eligibility || {})) {
    if (labels.includes(label)) {
      updates['Automation Eligibility'] = fieldVal;
    }
  }
  
  // Process work type mapping
  for (const [label, fieldVal] of Object.entries(labelMap.work_type || {})) {
    if (labels.includes(label)) {
      updates['Work Type'] = fieldVal;
    }
  }
  
  // Process agent mapping
  for (const [label, fieldVal] of Object.entries(labelMap.agent || {})) {
    if (labels.includes(label)) {
      updates['Primary Agent'] = fieldVal;
    }
  }
  
  // Process release blocker mapping
  for (const [label, fieldVal] of Object.entries(labelMap.release_blocker || {})) {
    if (labels.includes(label)) {
      updates['Release Blocker'] = fieldVal;
    }
  }
  
  // Process strategic theme mapping
  for (const [label, fieldVal] of Object.entries(labelMap.strategic_theme || {})) {
    if (labels.includes(label)) {
      updates['Strategic Theme'] = fieldVal;
    }
  }
  
  // Process customer impact mapping
  for (const [label, fieldVal] of Object.entries(labelMap.customer_impact || {})) {
    if (labels.includes(label)) {
      updates['Customer Impact'] = fieldVal;
    }
  }
  
  // Process reputation risk mapping
  for (const [label, fieldVal] of Object.entries(labelMap.reputation_risk || {})) {
    if (labels.includes(label)) {
      updates['Reputation Risk'] = fieldVal;
    }
  }
  
  // Process determinism risk mapping
  for (const [label, fieldVal] of Object.entries(labelMap.determinism_risk || {})) {
    if (labels.includes(label)) {
      updates['Determinism Risk'] = fieldVal;
    }
  }
  
  // Process CI status mapping
  for (const [label, fieldVal] of Object.entries(labelMap.ci_status || {})) {
    if (labels.includes(label)) {
      updates['CI Status Snapshot'] = fieldVal;
    }
  }
  
  return updates;
}

/**
 * Process milestone and map to release train
 */
function processMilestone(milestoneTitle) {
  const updates = {};
  
  if (!milestoneTitle) return updates;
  
  const milestoneLower = milestoneTitle.toLowerCase();
  
  // Try to match patterns from config
  for (const mapping of labelMap.milestone_release_train || []) {
    if (milestoneLower.includes(mapping.pattern.toLowerCase())) {
      updates['Release Train'] = mapping.value;
      break;
    }
  }
  
  // Additional pattern matching
  if (milestoneLower.includes('ga')) {
    updates['Release Train'] = 'GA';
  } else if (milestoneLower.includes('mvp-4')) {
    updates['Release Train'] = 'MVP-4';
  } else if (milestoneLower.includes('post-ga')) {
    updates['Release Train'] = 'Post-GA';
  } else if (milestoneLower.includes('weekly')) {
    updates['Release Train'] = 'Weekly';
  } else if (milestoneLower.includes('nightly')) {
    updates['Release Train'] = 'Nightly';
  }
  
  return updates;
}

/**
 * Process assignees and map to primary agent
 */
function processAssignees(assignees) {
  const updates = {};
  
  for (const assignee of assignees) {
    const login = assignee.login.toLowerCase();
    
    if (login.includes('jules')) {
      updates['Primary Agent'] = 'Jules';
    } else if (login.includes('codex')) {
      updates['Primary Agent'] = 'Codex';
    } else if (login.includes('claude')) {
      updates['Primary Agent'] = 'Claude';
    } else if (login.includes('qwen')) {
      updates['Primary Agent'] = 'Qwen';
    } else if (login.includes('atlas')) {
      updates['Primary Agent'] = 'Atlas';
    } else if (login.includes('anti') || login.includes('gravity')) {
      updates['Primary Agent'] = 'Antigravity';
    } else if (login.includes('bot') || login.includes('automation')) {
      updates['Work Type'] = 'Agent';
    }
  }
  
  return updates;
}

/**
 * Process title keywords for automatic classification
 */
function processTitleKeywords(title) {
  const updates = {};
  const titleLower = title.toLowerCase();
  
  // Priority detection from title
  if (titleLower.includes('p0') || titleLower.includes('critical') || titleLower.includes('emergency')) {
    updates['Priority'] = 'P0';
    updates['WIP Risk'] = 'High';
  } else if (titleLower.includes('p1') || titleLower.includes('high priority')) {
    updates['Priority'] = 'P1';
    updates['WIP Risk'] = 'Medium';
  } else if (titleLower.includes('p2') || titleLower.includes('medium priority')) {
    updates['Priority'] = 'P2';
    updates['WIP Risk'] = 'Medium';
  }
  
  // Release blocker detection
  if (titleLower.includes('release blocker') || titleLower.includes('blocks release')) {
    updates['Release Blocker'] = 'Yes';
  }
  
  // Security detection
  if (titleLower.includes('security') || titleLower.includes('vulnerability') || titleLower.includes('cve')) {
    updates['Delivery Class'] = 'Security';
    updates['Governance Gate'] = 'Security';
    updates['Audit Criticality'] = 'Control';
  }
  
  // Compliance detection
  if (titleLower.includes('compliance') || titleLower.includes('soc2') || titleLower.includes('iso')) {
    updates['Delivery Class'] = 'Compliance';
    updates['Governance Gate'] = 'Compliance';
    updates['Audit Criticality'] = 'Control';
  }
  
  // Infrastructure detection
  if (titleLower.includes('infra') || titleLower.includes('infrastructure') || titleLower.includes('deployment')) {
    updates['Delivery Class'] = 'Infra';
    updates['Governance Gate'] = 'Design';
  }
  
  return updates;
}

/**
 * Main function to handle event processing
 */
async function main() {
  const args = process.argv.slice(2);
  const eventType = args[0];
  const payloadPath = args[1];
  
  if (!eventType) {
    console.error('Usage: node event-processor.mjs <event_type> [payload_path]');
    console.error('Event type is required (e.g., issues, pull_request)');
    process.exit(1);
  }
  
  let payload;
  
  if (payloadPath && fs.existsSync(payloadPath)) {
    try {
      payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    } catch (error) {
      console.error(`Error reading payload from ${payloadPath}:`, error.message);
      process.exit(1);
    }
  } else if (process.env.GITHUB_EVENT_PATH) {
    try {
      payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    } catch (error) {
      console.error(`Error reading payload from GITHUB_EVENT_PATH:`, error.message);
      process.exit(1);
    }
  } else {
    // For testing purposes, create a sample payload
    console.log('No payload provided, using sample event...');
    payload = {
      issue: {
        number: 123,
        title: 'P0 Critical Security Fix',
        labels: [
          { name: 'security' },
          { name: 'p0' },
          { name: 'agent:execute' }
        ],
        milestone: { title: 'GA' },
        assignees: [{ login: 'jules-bot' }]
      }
    };
  }
  
  try {
    const { updates, issueNumber } = processGitHubEvent(eventType, payload);
    
    // Output results
    console.log('Event:', eventType);
    console.log('Issue/PR:', issueNumber);
    console.log('Field Updates:', JSON.stringify(updates, null, 2));
    
    // In a real implementation, this would call the Project update API
    // For now, we just output the planned updates
    const result = {
      event: eventType,
      issueNumber: issueNumber,
      fieldUpdates: updates,
      timestamp: new Date().toISOString(),
      dryRun: process.env.DRY_RUN === 'true'
    };
    
    // Write to output file for workflow consumption
    const outputDir = path.join(process.cwd(), 'artifacts', 'project19', 'events');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `event-processing-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Results saved to: ${outputFile}`);
    
    // Exit with success code
    process.exit(0);
  } catch (error) {
    console.error('Error processing event:', error.message);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

export default processGitHubEvent;