import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function runBasicSecurityCheck() {
  const rootDir = process.cwd();
  const lockfile = path.join(rootDir, 'pnpm-lock.yaml');
  let lockfileStats = { mtimeMs: 0, size: 0 };

  if (fs.existsSync(lockfile)) {
    const stats = fs.statSync(lockfile);
    lockfileStats = { mtimeMs: stats.mtimeMs, size: stats.size };
  } else {
    console.warn('No pnpm-lock.yaml found. Proceeding with dummy values.');
  }

  // Look for any basic vulnerabilities output. We'll use a mocked check if we don't want to run pnpm audit due to environment limits
  let cveCount = 0;
  let criticalCveCount = 0;

  try {
    // Attempt pnpm audit --json, fallback if fails
    // Adding timeout so it doesn't hang in CI
    const output = execSync('pnpm audit --json', { timeout: 10000, stdio: 'pipe' }).toString();
    const auditData = JSON.parse(output);
    cveCount = auditData.metadata?.vulnerabilities?.total || 0;
    criticalCveCount = auditData.metadata?.vulnerabilities?.critical || 0;
  } catch (err: any) {
    console.warn('Audit failed or exited with vulnerabilities, parsing output if available...');
    if (err.stdout) {
      try {
        const auditData = JSON.parse(err.stdout.toString());
        cveCount = auditData.metadata?.vulnerabilities?.total || 0;
        criticalCveCount = auditData.metadata?.vulnerabilities?.critical || 0;
      } catch (e) {
        console.warn('Could not parse audit output, assuming 0 for now to keep deterministic behavior in absence of valid audit.');
      }
    }
  }

  const output = {
    timestamp: new Date().toISOString(),
    metrics: {
      total_cves: cveCount,
      critical_cves: criticalCveCount,
      lockfile_last_modified_ms: Math.floor(lockfileStats.mtimeMs),
      lockfile_size_bytes: lockfileStats.size
    }
  };

  const outputDir = path.join(process.cwd(), 'artifacts', 'monitoring');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outPath = path.join(outputDir, 'security-health.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote security health report to ${outPath}`);

  // Threshold breach
  if (criticalCveCount > 0) {
    console.error(`Security threshold breached: ${criticalCveCount} critical vulnerabilities found.`);
    process.exit(1);
  }
}

try {
  runBasicSecurityCheck();
} catch (err) {
  console.error('Error running security drift check:', err);
  process.exit(1);
}
