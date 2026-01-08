#!/usr/bin/env node

import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import yargs from 'yargs-parser';
import yaml from 'js-yaml';

// Helper function to read a JSON file and return a default value if it doesn't exist.
async function readJsonFile(filePath, defaultVal = {}) {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultVal;
    }
    throw error;
  }
}

// Helper function to read a YAML file.
async function readYamlFile(filePath, defaultVal = {}) {
    try {
      const content = await readFile(filePath, 'utf-8');
      return yaml.load(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return defaultVal;
      }
      throw error;
    }
  }

// Parses the issuance markdown file to extract P0/P1 counts and blockers.
function parseIssuanceMarkdown(content) {
    const p0Match = content.match(/-\s+\*\*P0 Open:\*\*\s+(\d+)/);
    const p1Match = content.match(/-\s+\*\*P1 Open:\*\*\s+(\d+)/);
    const blockersMatch = content.match(/## Blockers\n((-\s+\[.+?\)\s+-\s+.+\n?)+)/);

    const blockers = [];
    if (blockersMatch) {
        const blockerLines = blockersMatch[1].split('\n').filter(line => line.trim() !== '');
        for (const line of blockerLines) {
            const blockerMatch = line.match(/-\s+\[(.+?)\]\(.+?\)\s+-\s+(.+)/);
            if (blockerMatch) {
                blockers.push({ id: blockerMatch[1], owner: blockerMatch[2], ticket: 'link' });
            }
        }
    }

    return {
        p0Open: p0Match ? parseInt(p0Match[1], 10) : 'UNKNOWN',
        p1Open: p1Match ? parseInt(p1Match[1], 10) : 'UNKNOWN',
        blockers: blockers,
    };
}

function getGatesFromWorkflow(workflowContent) {
    if (!workflowContent || !workflowContent.jobs) {
        return [{ gate: 'ga:verify', status: 'UNKNOWN', evidence: '#' }];
    }

    const releaseJob = workflowContent.jobs.release;
    if (!releaseJob || !releaseJob.needs) {
        return [{ gate: 'ga:verify', status: 'UNKNOWN', evidence: '#' }];
    }

    const requiredJobs = Array.isArray(releaseJob.needs) ? releaseJob.needs : [releaseJob.needs];

    return requiredJobs.map(jobName => ({
        gate: jobName,
        status: 'PENDING', // Or UNKNOWN, as we can't know the result yet.
        evidence: '#', // Placeholder link
    }));
}


async function main() {
  const args = yargs(process.argv.slice(2));

  const channel = args.channel || 'rc';
  const target = args.target || 'unknown-sha';
  const outDir = args.out ? path.dirname(args.out) : 'artifacts/release-readiness';
  const outFile = args.out || path.join(outDir, `onepager_${channel}_${target}.md`);
  const summaryFile = path.join(outDir, 'summary.json');

  const issuanceFile = args.issuanceFile || 'docs/releases/MVP-4_POST_GA_STABILIZATION_ISSUANCE.md';
  const policyFile = args.policyFile || 'release-policy.yml';
  const workflowFile = args.workflowFile || '.github/workflows/ga-release.yml';


  await mkdir(outDir, { recursive: true });

  // Load all the data files.
  const decisionData = await readJsonFile('artifacts/signoff/decision.json', { decision: 'NOT ELIGIBLE', reasons: ['Missing sign-off decision file.'] });
  const manifestData = await readJsonFile(`artifacts/release-bundle/${target}/MANIFEST.json`, { evidence: {} });
  const waiversData = await readJsonFile('artifacts/release-waivers/summary.json', { count: 'UNKNOWN', top: [] });
  const exceptionsData = await readJsonFile('artifacts/security-exceptions/summary.json', { count: 'UNKNOWN', highest_risk_rating: 'UNKNOWN' });
  const migrationsData = await readJsonFile('artifacts/migrations/summary.json', { irreversible_count: 'UNKNOWN', risky_count: 'UNKNOWN', waived: 'UNKNOWN' });
  const rollbackData = await readJsonFile('artifacts/rollback/summary.json', { readiness: 'UNKNOWN', lkg_available: 'UNKNOWN' });
  const issuanceContent = await readFile(issuanceFile, 'utf-8').catch(() => '');
  const issuanceData = parseIssuanceMarkdown(issuanceContent);
  const releasePolicy = await readYamlFile(policyFile, {});
  const workflowContent = await readYamlFile(workflowFile, {}); // Read workflow file

  const gates = getGatesFromWorkflow(workflowContent);

  const topWaivers = waiversData.top.slice(0, 2).map(w => `${w.id} (expires ${w.expiry})`).join(', ');

  const onePagerContent = `
# Release Readiness Executive One-Pager

| Channel | Target | Generated | Decision |
|---|---|---|---|
| ${channel.toUpperCase()} | \`${target}\` | ${new Date().toISOString()} | **${decisionData.decision}** |

## 1 — Decision Drivers
${decisionData.reasons.map(d => `- ${d}`).join('\n')}

## 2 — Gates Snapshot
| Gate | Status | Evidence |
|---|---|---|
${gates.map(g => `| ${g.gate} | ${g.status} | [View](${g.evidence}) |`).join('\n')}


## 3 — Issuance & Risk Snapshot
- **P0 Open:** ${issuanceData.p0Open}
- **P1 Open:** ${issuanceData.p1Open}
- **Blockers:** ${issuanceData.blockers.length > 0 ? issuanceData.blockers.map(b => `${b.id} (${b.owner})`).join(', ') : 'None'}
- **Active Waivers:** ${waiversData.count} ${topWaivers ? `(${topWaivers})` : ''}
- **Security Exceptions:** ${exceptionsData.count} (Highest Risk: ${exceptionsData.highest_risk_rating})

## 4 — Data & Rollback Safety
- **Irreversible Migrations:** ${migrationsData.irreversible_count}
- **Risky Migrations:** ${migrationsData.risky_count}
- **Rollback Readiness:** ${rollbackData.readiness}
- **LKG Available:** ${rollbackData.lkg_available}

## 5 — Evidence Completeness
- **Evidence Bundle Present:** ${manifestData.sha ? 'yes' : 'no'}
- **Manifest Checksums Present:** ${manifestData.artifacts ? 'yes' : 'no'}
- **Provenance Stub Present:** ${manifestData.evidence.provenanceStub ? 'yes' : 'no'}
- **Dependency Snapshot Present:** ${manifestData.evidence.dependencySnapshot ? 'yes' : 'no'}
- **License Inventory Present:** ${manifestData.evidence.licenseInventory ? 'yes' : 'no'}

## 6 — Approval Ask
${decisionData.decision === 'ELIGIBLE' ? `Approval requested for: Cut ${channel.toUpperCase()} release from \`${target}\`` : 'Not eligible; fix blockers above.'}
`;

  await writeFile(outFile, onePagerContent.trim());
  console.log(`Successfully generated one-pager at: ${outFile}`);

  const summary = {
    decision: decisionData.decision,
    decisionDrivers: decisionData.reasons.slice(0, 3)
  };

  await writeFile(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`Successfully generated summary at: ${summaryFile}`);
}


main().catch(err => {
    console.error(err);
    process.exit(1);
});
