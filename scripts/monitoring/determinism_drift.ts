import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ARTIFACT_DIR = path.resolve('artifacts/monitoring');
const OUTPUT_FILE = path.join(ARTIFACT_DIR, 'determinism-drift.json');
const EVALS_DIR = path.resolve('artifacts/ai-evals');

function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: any = {};
  Object.keys(obj).sort().forEach(k => {
    sorted[k] = sortObjectKeys(obj[k]);
  });
  return sorted;
}

function findNonDeterministicFields(obj: any, currentPath: string = ''): string[] {
  let fields: string[] = [];
  if (typeof obj === 'string') {
    // Regex for basic ISO timestamp or common UUID patterns
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (isoDateRegex.test(obj) || uuidRegex.test(obj)) {
      fields.push(currentPath);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      fields = fields.concat(findNonDeterministicFields(item, `${currentPath}[${index}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      if (key.toLowerCase().includes('timestamp') || key.toLowerCase() === 'id') {
         // Also loosely flag fields named timestamp or id if they look non-deterministic
         if (typeof value === 'string' || typeof value === 'number') {
            // We'll trust exact regexes more for general fields, but flag these based on name
            fields.push(newPath);
         }
      }
      fields = fields.concat(findNonDeterministicFields(value, newPath));
    }
  }
  return [...new Set(fields)];
}

async function run() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const results: Record<string, string[]> = {};
  let totalDriftCount = 0;
  let issueBody = '';

  if (fs.existsSync(EVALS_DIR)) {
    const files = fs.readdirSync(EVALS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(EVALS_DIR, file);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const driftFields = findNonDeterministicFields(content);
        if (driftFields.length > 0) {
          results[file] = driftFields;
          totalDriftCount += driftFields.length;
          issueBody += `- **${file}**: ${driftFields.join(', ')}\n`;
        }
      } catch (e) {
         console.warn(`Failed to parse ${file}`);
      }
    }
  } else {
    console.log(`Directory ${EVALS_DIR} not found. Exiting gracefully.`);
  }

  const outputData = sortObjectKeys({
    files_with_drift: results,
    total_drift_fields: totalDriftCount,
    timestamp: new Date().toISOString() // We allow timestamp here in the monitoring output itself if it's not strictly governed, but wait! The principles say "deterministic outputs (stable JSON)". Let's remove the timestamp from output.
  });

  // Re-define without timestamp
  const stableOutputData = sortObjectKeys({
    files_with_drift: results,
    total_drift_fields: totalDriftCount
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stableOutputData, null, 2) + '\n');
  console.log(`Saved determinism drift data to ${OUTPUT_FILE}`);

  if (issueBody && process.env.GITHUB_TOKEN) {
    console.log('Drift detected. Checking if issue needs to be created...');
    try {
      const title = 'Determinism Drift Detected in AI Evals';
      const checkIssue = execSync(`gh issue list --search "in:title \\"${title}\\\" is:open" --json number`, { encoding: 'utf-8' });
      const existingIssues = JSON.parse(checkIssue);

      if (existingIssues.length === 0) {
        console.log('Creating issue...');
        const fullBody = `Non-deterministic fields (e.g. timestamps, random IDs) were detected in AI eval baseline files:\n\n${issueBody}`;
        fs.writeFileSync('/tmp/drift_issue.md', fullBody);
        execSync(`gh issue create --title "${title}" --body-file /tmp/drift_issue.md`);
      } else {
        console.log('Issue already exists, skipping creation.');
      }
    } catch (error) {
      console.error('Failed to create or check issue:', error);
    }
  }
}

run().catch(console.error);
