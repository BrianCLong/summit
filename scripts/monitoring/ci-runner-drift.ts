import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

const WORKFLOWS_DIR = '.github/workflows';

interface Finding {
  file: string;
  level: 'ERROR' | 'WARNING';
  message: string;
}

const findings: Finding[] = [];

function checkRunnerValue(value: string, fileName: string, context: string) {
  if (value === 'ubuntu-20.04') {
    findings.push({
      file: fileName,
      level: 'ERROR',
      message: `[${context}] Deprecated runner found: ${value}. Ubuntu 20.04 is deprecated.`,
    });
  } else if (value === 'ubuntu-latest') {
    findings.push({
      file: fileName,
      level: 'WARNING',
      message: `[${context}] Unpinned runner found: ${value}. "ubuntu-latest" has moved to Ubuntu 24.04. Consider pinning to "ubuntu-22.04" or "ubuntu-24.04".`,
    });
  }
}

function traverse(node: any, pathStack: string[], fileName: string) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    node.forEach((item, index) => traverse(item, [...pathStack, `[${index}]`], fileName));
    return;
  }

  for (const key in node) {
    const value = node[key];
    const currentPath = [...pathStack, key];

    // Node version check (generic traversal finds this anywhere)
    if (key === 'node-version') {
       const version = String(value).replace(/^v/, '');
       const majorStr = version.split('.')[0];
       const major = parseInt(majorStr, 10);

       if (!isNaN(major) && major < 18) {
         findings.push({
           file: fileName,
           level: 'ERROR',
           message: `EOL Node.js version found: ${value}. Node 16 and below are End-of-Life.`,
         });
       }
    }

    traverse(value, currentPath, fileName);
  }
}

function checkWorkflowStructure(fileName: string, doc: any) {
    if (!doc || !doc.jobs) return;

    for (const jobId in doc.jobs) {
        const job = doc.jobs[jobId];
        if (!job) continue;

        const runsOn = job['runs-on'];

        // Handle String 'runs-on'
        if (typeof runsOn === 'string') {
            if (runsOn.includes('${{')) {
                // Dynamic value detected. Check strategy.matrix.
                if (job.strategy && job.strategy.matrix) {
                    const matrix = job.strategy.matrix;

                    // Scan all keys in matrix for arrays of strings
                    for (const key in matrix) {
                         const val = matrix[key];
                         if (key === 'include' || key === 'exclude') continue; // Handle separately

                         if (Array.isArray(val)) {
                             val.forEach(v => {
                                 if (typeof v === 'string') checkRunnerValue(v, fileName, `Job: ${jobId}, Matrix: ${key}`);
                             });
                         }
                    }

                    // Handle include block
                    if (matrix.include && Array.isArray(matrix.include)) {
                        matrix.include.forEach((item: any, idx: number) => {
                            for (const k in item) {
                                if (typeof item[k] === 'string') checkRunnerValue(item[k], fileName, `Job: ${jobId}, Matrix Include[${idx}]`);
                            }
                        });
                    }
                }
            } else {
                // Static string
                checkRunnerValue(runsOn, fileName, `Job: ${jobId}`);
            }
        }
        // Handle Array 'runs-on' (e.g. self-hosted labels)
        else if (Array.isArray(runsOn)) {
             runsOn.forEach(r => {
                 if(typeof r === 'string') {
                     if (r.includes('${{')) {
                         // If array element is dynamic? Rare but possible.
                     } else {
                         checkRunnerValue(r, fileName, `Job: ${jobId}`);
                     }
                 }
             });
        }
    }
}

function main() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.error(`Directory not found: ${WORKFLOWS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  console.log(`Scanning ${files.length} workflows in ${WORKFLOWS_DIR}...`);

  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const doc = yaml.load(content);

      // 1. Structured check for runs-on (handles matrix)
      checkWorkflowStructure(file, doc);

      // 2. Generic traversal for node-version
      traverse(doc, [], file);

    } catch (e: any) {
      console.error(`Failed to parse ${file}: ${e.message}`);
    }
  }

  // Deduplicate
  const uniqueFindings = findings.filter((value, index, self) =>
    index === self.findIndex((t) => (
      t.file === value.file && t.message === value.message && t.level === value.level
    ))
  );

  const errors = uniqueFindings.filter(f => f.level === 'ERROR');
  const warnings = uniqueFindings.filter(f => f.level === 'WARNING');

  console.log('\n--- CI Runner Drift Report ---');
  console.log(`Found ${errors.length} Errors and ${warnings.length} Warnings.\n`);

  if (warnings.length > 0) {
    console.log('WARNINGS (Non-blocking but require attention):');
    warnings.forEach(w => console.log(`[WARNING] ${w.file}: ${w.message}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('ERRORS (Blocking):');
    errors.forEach(e => console.log(`[ERROR] ${e.file}: ${e.message}`));
    console.log('');
    process.exit(1);
  } else {
    console.log('No blocking drift detected.');
    process.exit(0);
  }
}

main();
