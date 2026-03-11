import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ARTIFACT_DIR = path.resolve('artifacts/monitoring');
const OUTPUT_FILE = path.join(ARTIFACT_DIR, 'security-health.json');

function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: any = {};
  Object.keys(obj).sort().forEach(k => {
    sorted[k] = sortObjectKeys(obj[k]);
  });
  return sorted;
}

async function run() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  console.log('Running security audit...');
  let auditOutput = '';
  let vulnerabilitiesFound = 0;
  let criticalVulnerabilities = 0;
  let highVulnerabilities = 0;
  let auditData: any = {};

  try {
    auditOutput = execSync('pnpm audit --json', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (error: any) {
    // pnpm audit exits with non-zero code if vulnerabilities are found
    if (error.stdout) {
      auditOutput = error.stdout.toString();
    } else {
      console.error('Failed to run pnpm audit. Ensure pnpm is installed and lockfile is present.');
      process.exit(1);
    }
  }

  try {
    auditData = JSON.parse(auditOutput);
    if (auditData.metadata && auditData.metadata.vulnerabilities) {
      vulnerabilitiesFound = auditData.metadata.vulnerabilities.total || 0;
      criticalVulnerabilities = auditData.metadata.vulnerabilities.critical || 0;
      highVulnerabilities = auditData.metadata.vulnerabilities.high || 0;
    }
  } catch (error) {
    console.warn('Failed to parse pnpm audit JSON output. Output was:', auditOutput.substring(0, 100));
  }

  const outputData = sortObjectKeys({
    critical_vulnerabilities: criticalVulnerabilities,
    high_vulnerabilities: highVulnerabilities,
    total_vulnerabilities: vulnerabilitiesFound
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2) + '\n');
  console.log(`Saved security health data to ${OUTPUT_FILE}`);

  if ((criticalVulnerabilities > 0 || highVulnerabilities > 0) && process.env.GITHUB_TOKEN) {
    console.log('High/Critical vulnerabilities found. Checking if issue needs to be created...');
    try {
      const title = 'High/Critical Security Vulnerabilities Detected';
      const checkIssue = execSync(`gh issue list --search "in:title \\"${title}\\\" is:open" --json number`, { encoding: 'utf-8' });
      const existingIssues = JSON.parse(checkIssue);

      if (existingIssues.length === 0) {
        console.log('Creating issue...');
        const fullBody = `The latest scheduled security drift monitor detected new high or critical vulnerabilities in the lockfile.\n\n- Critical: ${criticalVulnerabilities}\n- High: ${highVulnerabilities}\n\nPlease run \`pnpm audit\` to review and address them.`;
        fs.writeFileSync('/tmp/security_issue.md', fullBody);
        execSync(`gh issue create --title "${title}" --body-file /tmp/security_issue.md`);
      } else {
        console.log('Issue already exists, skipping creation.');
      }
    } catch (error) {
      console.error('Failed to create or check issue:', error);
    }
  }
}

run().catch(console.error);
