import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function checkSecurityDrift() {
  const result: Record<string, any> = {
    audit_passed: false,
    critical_vulnerabilities: 0,
    high_vulnerabilities: 0,
    total_vulnerabilities: 0,
    vulnerability_details: []
  };

  try {
    console.log('Running pnpm audit --json...');
    const output = execSync('pnpm audit --json', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const auditData = JSON.parse(output);

    processAuditData(auditData, result);
    result.audit_passed = result.critical_vulnerabilities === 0 && result.high_vulnerabilities === 0;

  } catch (error: any) {
    // pnpm audit exits with non-zero if vulnerabilities are found.
    // We catch the error, parse stdout to get the JSON, and process it.
    if (error.stdout) {
      try {
        const auditData = JSON.parse(error.stdout.toString());
        processAuditData(auditData, result);
        result.audit_passed = result.critical_vulnerabilities === 0 && result.high_vulnerabilities === 0;
      } catch (parseError) {
        console.error('Failed to parse audit JSON output:', parseError);
        result.error = 'Failed to parse audit output';
      }
    } else {
       console.error('Failed to run pnpm audit:', error);
       result.error = error.message;
    }
  }

  // Sort deterministically
  const sortedResult = Object.keys(result)
    .sort()
    .reduce((acc: Record<string, any>, key: string) => {
      acc[key] = result[key];
      return acc;
    }, {});

  writeOutput(sortedResult);

  // Alert on high/critical vulns
  if (result.critical_vulnerabilities > 0 || result.high_vulnerabilities > 0) {
      const summary = `Found ${result.critical_vulnerabilities} critical and ${result.high_vulnerabilities} high vulnerabilities.`;
      const details = result.vulnerability_details.map((v: any) => `- **${v.severity}**: ${v.module_name} (${v.title})`).join('\n');

      createIssue('🚨 Security Drift Detected', `${summary}\n\nDetails:\n${details}`).catch(console.error);
  }
}

async function createIssue(title: string, body: string) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log(`[Dry Run Issue] ${title}\n${body}`);
    return;
  }

  try {
    const url = `https://api.github.com/repos/${repo}/issues`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body, labels: ['monitoring', 'security-drift'] })
    });

    if (!res.ok) {
       console.error(`Failed to create issue: ${res.status} ${res.statusText}`);
    } else {
       console.log(`Successfully created issue: ${title}`);
    }
  } catch (e) {
    console.error('Error creating issue:', e);
  }
}

function processAuditData(data: any, result: Record<string, any>) {
  if (data && data.metadata && data.metadata.vulnerabilities) {
    result.total_vulnerabilities = Object.values(data.metadata.vulnerabilities).reduce((a: any, b: any) => a + b, 0) as number;
    result.critical_vulnerabilities = data.metadata.vulnerabilities.critical || 0;
    result.high_vulnerabilities = data.metadata.vulnerabilities.high || 0;
  }

  if (data && data.advisories) {
    for (const [id, advisory] of Object.entries(data.advisories)) {
      const adv = advisory as any;
      result.vulnerability_details.push({
         id: adv.id,
         module_name: adv.module_name,
         severity: adv.severity,
         title: adv.title
      });
    }
  }

  // Sort details deterministically
  result.vulnerability_details.sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
}

function writeOutput(data: any) {
  const outPath = path.resolve('artifacts/monitoring/security-health.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote security health data to ${outPath}`);
}

checkSecurityDrift();
