import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function stableStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  } else if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj).sort();
    let str = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) str += ',';
      str += `"${keys[i]}":${stableStringify(obj[keys[i]])}`;
    }
    str += '}';
    return str;
  }
  return JSON.stringify(obj);
}

function checkSecurityDrift() {
  let hasDrift = false;
  let checksPassed = 0;
  let checksFailed = 0;
  let logs: string[] = [];

  try {
    // Attempting a simple pnpm audit as a proxy for basic drift monitoring
    const output = execSync('pnpm audit --json', { encoding: 'utf8' });
    const auditData = JSON.parse(output);
    checksPassed++;

    // Check if there's any vulnerabilities found in the audit
    const vulnerabilities = auditData.metadata?.vulnerabilities || {};
    const totalVulnerabilities = Object.values(vulnerabilities).reduce((a: any, b: any) => a + b, 0);

    if (totalVulnerabilities > 0) {
        hasDrift = true;
        logs.push(`pnpm audit found ${totalVulnerabilities} vulnerabilities`);
    } else {
        logs.push('pnpm audit found 0 vulnerabilities');
    }

  } catch (error: any) {
    // 'pnpm audit --json' exits with a non-zero status code if vulnerabilities exist
    try {
        const auditData = JSON.parse(error.stdout);
        const vulnerabilities = auditData.metadata?.vulnerabilities || {};
        const totalVulnerabilities = Object.values(vulnerabilities).reduce((a: any, b: any) => a + b, 0);

        hasDrift = totalVulnerabilities > 0;
        if (hasDrift) {
           logs.push(`pnpm audit found ${totalVulnerabilities} vulnerabilities`);
        }
        checksPassed++; // The check itself ran successfully
    } catch (e) {
        hasDrift = true;
        checksFailed++;
        logs.push(`Error executing security checks: ${error.message}`);
    }
  }

  // Also verify `pnpm-lock.yaml` size/existence simply to track drift
  const lockfilePath = path.resolve('pnpm-lock.yaml');
  let lockfileSize = 0;
  if (fs.existsSync(lockfilePath)) {
     lockfileSize = fs.statSync(lockfilePath).size;
     logs.push(`Tracked pnpm-lock.yaml of size ${lockfileSize} bytes`);
  } else {
     logs.push('pnpm-lock.yaml not found, tracking missed');
  }

  const output = {
    checks_failed: checksFailed,
    checks_passed: checksPassed,
    has_drift: hasDrift,
    lockfile_size_bytes: lockfileSize,
    logs: logs
  };

  const formattedOutput = JSON.stringify(JSON.parse(stableStringify(output)), null, 2);
  const outPath = path.resolve('artifacts/monitoring/security-health.json');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, formattedOutput + '\n');

  console.log(`Security drift report written to ${outPath}`);
}

checkSecurityDrift();
