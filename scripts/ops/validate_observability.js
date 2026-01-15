#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DASHBOARDS_DIR = path.join(__dirname, '../../ops/observability/grafana/dashboards');
const ALERTS_DIR = path.join(__dirname, '../../ops/observability/alerting');
const RUNBOOKS_DIR = path.join(__dirname, '../../ops/observability/runbooks');

// Validation 1: Dashboard JSON validity
function validateDashboards() {
  console.log('Validating dashboards...');
  const files = fs.readdirSync(DASHBOARDS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(DASHBOARDS_DIR, file), 'utf8');
      JSON.parse(content);
      console.log(`✅ ${file} is valid JSON.`);
    } catch (e) {
      console.error(`❌ ${file} is invalid JSON:`, e.message);
      process.exit(1);
    }
  }
}

// Validation 2: Alert Rules and Runbook Links
function validateAlerts() {
  console.log('Validating alerts and runbook links...');
  const files = fs.readdirSync(ALERTS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  let hasError = false;

  for (const file of files) {
    const content = fs.readFileSync(path.join(ALERTS_DIR, file), 'utf8');

    // Simple YAML parsing (regex-based for now to avoid deps, but could use js-yaml)
    // Looking for "runbook_url"
    const lines = content.split('\n');
    let currentAlert = null;

    for (const line of lines) {
      const alertMatch = line.match(/alert:\s+(.+)/);
      if (alertMatch) {
        currentAlert = alertMatch[1];
      }

      if (currentAlert && line.includes('runbook_url:')) {
        const urlMatch = line.match(/runbook_url:\s+(.+)/);
        if (urlMatch) {
          const url = urlMatch[1].trim();
          // Extract filename from URL assuming standard format
          const filenameMatch = url.split('/').pop();
          if (filenameMatch) {
             const runbookPath = path.join(RUNBOOKS_DIR, filenameMatch);
             if (fs.existsSync(runbookPath)) {
               console.log(`✅ Alert '${currentAlert}' links to existing runbook '${filenameMatch}'.`);
             } else {
               console.error(`❌ Alert '${currentAlert}' links to MISSING runbook '${filenameMatch}' (at ${runbookPath}).`);
               hasError = true;
             }
          }
        }
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }
}

validateDashboards();
validateAlerts();
console.log('All observability assets verified.');
