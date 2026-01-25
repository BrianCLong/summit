import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// --- Type Definitions ---

interface PR {
  number: number;
  title: string;
  headRefName: string;
  author: { login: string };
  updatedAt: string;
  labels: { name: string }[];
  mergeable: string;
  state: string;
  files: { path: string }[];
  additions: number;
  deletions: number;
  statusCheckRollup?: StatusCheckRollup;
}

interface StatusCheckRollup {
  state: string;
  contexts?: {
    context: string;
    state: string;
    description: string;
    targetUrl: string;
  }[];
}

interface Issue {
  number: number;
  title: string;
  labels: { name: string }[];
  updatedAt: string;
  state: string;
}

interface Alert {
  number: number;
  html_url: string;
  state: string;
  rule: { severity: string; description: string };
}

interface CommandContext {
  mode: 'live' | 'offline';
  snapshotsDir: string;
  outputFile: string;
  failOnP0: boolean;
}

// --- Configuration & Helpers ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const DOCS_OPS_DIR = path.resolve(ROOT_DIR, 'docs/ops');
const SNAPSHOTS_DIR = path.resolve(__dirname, 'snapshots');

const OWNERS = {
  CLAUDE: 'Claude (Systemic/CI)',
  QWEN: 'Qwen (Package/Fix)',
  CODEX: 'Codex (Mechanical)',
  JULES: 'Jules (Governance/Docs)',
};

const CLUSTERS = {
  ERR_MODULE_NOT_FOUND: /ERR_MODULE_NOT_FOUND/,
  ESM_CJS: /ESM|CJS|transform|import|export/,
  DUPLICATE_METRIC: /Duplicate metric|prom-client/,
  NETWORK: /Redis|connection|socket|hangup/,
  TIMEOUT: /ETIMEDOUT|timeout|Open handle/,
  LINT_BUILD: /Lint|Typecheck|Build failed/,
};

// --- Data Fetching ---

function readJsonFile<T>(filepath: string): T {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // console.warn(`Warning: Could not read ${filepath}. Returning empty/default.`);
    return {} as unknown as T;
  }
}

function getGovernanceData(ctx: CommandContext) {
  const govData = {
    drift: { status: 'UNKNOWN', output: '' },
    docs: { status: 'UNKNOWN', violations: 0 },
    evidence: { status: 'UNKNOWN', warnings: 0 },
  };

  if (ctx.mode === 'live') {
    // 1. Compliance Drift
    try {
      execSync('npx tsx scripts/compliance/check_drift.ts', { stdio: 'pipe' });
      govData.drift.status = 'PASS';
    } catch (error: any) {
      govData.drift.status = 'FAIL';
      govData.drift.output = error.stderr?.toString() || error.stdout?.toString() || 'Unknown error';
    }

    // 2. Docs Integrity
    try {
      const reportPath = 'artifacts/governance/command-center-docs';
      fs.rmSync(reportPath, { recursive: true, force: true });
      execSync(`node scripts/ci/verify_governance_docs.mjs --out ${reportPath}`, { stdio: 'pipe' });
      govData.docs.status = 'PASS';
      const report = readJsonFile<any>(path.join(reportPath, 'report.json'));
      govData.docs.violations = report.violations?.length || 0;
    } catch (error: any) {
       govData.docs.status = 'FAIL';
       const reportPath = 'artifacts/governance/command-center-docs';
       const report = readJsonFile<any>(path.join(reportPath, 'report.json'));
       govData.docs.violations = report.violations?.length || 0;
    }

    // 3. Evidence Consistency
    try {
      const reportPath = 'artifacts/governance/command-center-evidence';
      fs.rmSync(reportPath, { recursive: true, force: true });
      // Pass --sha=latest to ensure deterministic output path (script appends sha to output dir)
      execSync(`node scripts/ci/verify_evidence_id_consistency.mjs --evidence-map-path=docs/evidence/evidence-map.yml --output=${reportPath} --sha=latest`, { stdio: 'pipe' });
      govData.evidence.status = 'PASS';
      const report = readJsonFile<any>(path.join(reportPath, 'latest', 'report.json'));
      govData.evidence.warnings = report.totals?.warnings || 0;
    } catch (error: any) {
       govData.evidence.status = 'FAIL';
       const reportPath = 'artifacts/governance/command-center-evidence';
       const report = readJsonFile<any>(path.join(reportPath, 'latest', 'report.json'));
       govData.evidence.warnings = report.totals?.warnings || 0;
    }
  }

  return govData;
}

function runGhCommand(args: string[]): any {
  try {
    const result = spawnSync('gh', args, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr);
    return JSON.parse(result.stdout);
  } catch (error) {
    console.error(`Error running gh ${args.join(' ')}:`, error);
    return [];
  }
}

function getData(ctx: CommandContext) {
  const govData = getGovernanceData(ctx);

  if (ctx.mode === 'offline') {
    console.log(`[Offline] Reading snapshots from ${ctx.snapshotsDir}...`);
    return {
      prs: readJsonFile<PR[]>(path.join(ctx.snapshotsDir, 'pr_list.json')),
      // In offline mode, pr_list.json usually contains the status rollup if captured correctly,
      // or we might have a separate file. For simplicity, we assume pr_list.json has what we need
      // or we merge. The requirement mentions pr_checks.json.
      prChecks: readJsonFile<any[]>(path.join(ctx.snapshotsDir, 'pr_checks.json')),
      issues: readJsonFile<Issue[]>(path.join(ctx.snapshotsDir, 'issues.json')),
      codeScanning: readJsonFile<Alert[]>(path.join(ctx.snapshotsDir, 'code_scanning.json')),
      dependabot: readJsonFile<Alert[]>(path.join(ctx.snapshotsDir, 'dependabot.json')),
      govData,
    };
  } else {
    console.log('[Live] Fetching data from GitHub...');
    // In live mode, we fetch rich data.
    // 1. PRs with files and rollup
    const prs = runGhCommand([
      'pr', 'list', '--limit', '50', '--json',
      'number,title,headRefName,author,updatedAt,labels,mergeable,state,files,additions,deletions,statusCheckRollup'
    ]);

    // 2. Issues
    const issues = runGhCommand([
      'issue', 'list', '--limit', '100', '--json',
      'number,title,labels,updatedAt,state'
    ]);

    // 3. Alerts (might fail if no permissions)
    let codeScanning = [];
    let dependabot = [];
    try {
      // Need to find owner/repo first
      const repoView = runGhCommand(['repo', 'view', '--json', 'name,owner']);
      const owner = repoView.owner.login;
      const repo = repoView.name;

      codeScanning = runGhCommand(['api', '-H', 'Accept: application/vnd.github+json', `/repos/${owner}/${repo}/code-scanning/alerts?per_page=100`]);
      dependabot = runGhCommand(['api', '-H', 'Accept: application/vnd.github+json', `/repos/${owner}/${repo}/dependabot/alerts?per_page=100`]);
    } catch (e) {
      console.warn('Could not fetch alerts (auth/scope limitations).');
    }

    return { prs, prChecks: [], issues, codeScanning, dependabot, govData };
  }
}

// --- Logic ---

function routePR(pr: PR): string {
  // 1. Check labels first (if we had specific owner labels)

  // 2. Check files
  const files = pr.files?.map(f => f.path) || [];

  // Jules: Docs & Governance
  if (files.every(f => f.startsWith('docs/') || f.startsWith('scripts/') || f.endsWith('.md'))) {
    return OWNERS.JULES;
  }

  // Claude: Systemic CI, Workflows, Root config
  if (files.some(f => f.startsWith('.github/') || f === 'package.json' || f === 'pnpm-workspace.yaml')) {
    return OWNERS.CLAUDE;
  }

  // Codex: Wide mechanical edits (heuristic: many files, mechanical title)
  if (files.length > 10 && (pr.title.startsWith('chore:') || pr.title.includes('update'))) {
    return OWNERS.CODEX;
  }

  // Qwen: Default for code
  return OWNERS.QWEN;
}

function clusterFailures(pr: PR) {
  const rollup = pr.statusCheckRollup;
  if (!rollup || rollup.state === 'SUCCESS') return 'GREEN';
  if (rollup.state === 'PENDING') return 'PENDING';

  const failures = rollup.contexts?.filter(c => c.state === 'FAILURE' || c.state === 'ERROR') || [];
  if (failures.length === 0) return 'UNKNOWN_FAILURE';

  // Check descriptions against regex
  for (const f of failures) {
    const desc = f.description || '';
    if (CLUSTERS.ERR_MODULE_NOT_FOUND.test(desc)) return 'ERR_MODULE_NOT_FOUND';
    if (CLUSTERS.ESM_CJS.test(desc)) return 'ESM/CJS_ISSUES';
    if (CLUSTERS.DUPLICATE_METRIC.test(desc)) return 'DUPLICATE_METRIC';
    if (CLUSTERS.NETWORK.test(desc)) return 'NETWORK_LEAK';
    if (CLUSTERS.TIMEOUT.test(desc)) return 'TIMEOUT_HANG';
    if (CLUSTERS.LINT_BUILD.test(desc)) return 'LINT_BUILD_FAIL';
  }

  return 'OTHER_FAILURE';
}

function determineMergePriority(pr: PR, cluster: string, owner: string): number {
  // Lower is better
  if (cluster === 'GREEN') return 10;
  if (pr.labels.some(l => l.name === 'P0' || l.name === 'security')) return 20;
  if (pr.title.startsWith('fix:')) return 30;
  if (owner === OWNERS.JULES) return 40; // Low risk
  if (owner === OWNERS.CLAUDE) return 50; // High leverage but risky
  if (owner === OWNERS.QWEN) return 60;
  return 100;
}

// --- Output Generation ---

function generateMarkdown(data: any) {
  const { prs, issues, codeScanning, dependabot } = data;

  // Process PRs
  const processedPRs = (prs || []).map((pr: PR) => {
    const owner = routePR(pr);
    const cluster = clusterFailures(pr);
    const priority = determineMergePriority(pr, cluster, owner);
    return { ...pr, owner, cluster, priority };
  });

  // Sort by priority
  processedPRs.sort((a: any, b: any) => a.priority - b.priority);

  // Stats
  const openIssueCount = issues.length;
  const p0Issues = issues.filter((i: Issue) => i.labels.some(l => l.name === 'P0'));
  const securityAlerts = (codeScanning.length || 0) + (dependabot.length || 0);

  // Current Date
  const date = new Date().toISOString().split('T')[0];

  let md = `# Command Center Report (${date})\n\n`;

  // Executive Summary
  md += `## 1. Executive Summary\n`;
  md += `- **Blocking Main**: ${p0Issues.length} P0 Issues, ${securityAlerts} Security Alerts\n`;
  md += `- **Open PRs**: ${processedPRs.length}\n`;
  md += `- **CI Status**: Analysis below\n\n`;

  // Merge Train
  md += `## 2. Recommended Merge Train (Top 10)\n`;
  md += `| Priority | PR | Owner | Status | Title |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  processedPRs.slice(0, 10).forEach((pr: any, idx: number) => {
    md += `| ${idx + 1} | #${pr.number} | ${pr.owner.split(' ')[0]} | ${pr.cluster} | ${pr.title} |\n`;
  });
  md += `\n`;

  // Fail Clusters & Routing
  md += `## 3. Failure Clusters & Routing\n`;
  const byCluster = processedPRs.reduce((acc: any, pr: any) => {
    if (pr.cluster === 'GREEN' || pr.cluster === 'PENDING') return acc;
    acc[pr.cluster] = (acc[pr.cluster] || []);
    acc[pr.cluster].push(pr);
    return acc;
  }, {});

  if (Object.keys(byCluster).length === 0) {
    md += `_No failures detected in top PRs._\n\n`;
  } else {
    for (const [cluster, items] of Object.entries(byCluster)) {
      md += `### ${cluster}\n`;
      // @ts-ignore
      items.forEach((pr: any) => {
        md += `- #${pr.number} (${pr.owner}): ${pr.title}\n`;
      });
      md += `\n`;
    }
  }

  // Issues
  md += `## 4. Issue Radar\n`;
  if (p0Issues.length > 0) {
    md += `**P0 / CRITICAL**:\n`;
    p0Issues.forEach((i: Issue) => {
      md += `- #${i.number} ${i.title}\n`;
    });
  } else {
    md += `No P0 issues found.\n`;
  }
  md += `\n`;

  // Security
  md += `## 5. Security Posture\n`;
  if (securityAlerts > 0) {
    md += `- **Code Scanning**: ${codeScanning.length}\n`;
    md += `- **Dependabot**: ${dependabot.length}\n`;
  } else {
    md += `No active security alerts accessible.\n`;
  }
  md += `\n`;

  // Plan
  md += `## 6. Today's Plan\n`;
  md += `1. **Review P0s**: Resolve any blocking P0 issues immediately.\n`;
  md += `2. **Merge Green**: Clear the ${processedPRs.filter((p: any) => p.cluster === 'GREEN').length} green PRs.\n`;
  md += `3. **Fix Systemic**: Claude to address CI failures in workflow files.\n`;
  md += `4. **Docs/Gov**: Jules to merge documentation updates.\n`;

  // Governance
  if (data.govData) {
    const { drift, docs, evidence } = data.govData;
    md += `\n## 7. Governance & Evidence\n`;
    md += `- **Compliance Drift**: ${drift.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`;
    if (drift.status === 'FAIL') md += `  - Drift Output: ${drift.output.split('\n')[0]}...\n`;
    md += `- **Docs Integrity**: ${docs.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} (${docs.violations} violations)\n`;
    md += `- **Evidence Consistency**: ${evidence.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} (${evidence.warnings} warnings)\n`;
  }

  return md;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--mode=live') ? 'live' : 'offline';
  const snapshotsDirArg = args.find(a => a.startsWith('--snapshotsDir='));
  const snapshotsDir = snapshotsDirArg ? snapshotsDirArg.split('=')[1] : SNAPSHOTS_DIR;
  const failOnP0 = args.includes('--failOnP0');

  const ctx: CommandContext = {
    mode,
    snapshotsDir,
    outputFile: path.join(DOCS_OPS_DIR, 'COMMAND_CENTER.md'),
    failOnP0
  };

  console.log(`Starting Command Center Generator (${mode})...`);
  const data = getData(ctx);
  const markdown = generateMarkdown(data);

  fs.mkdirSync(path.dirname(ctx.outputFile), { recursive: true });
  fs.writeFileSync(ctx.outputFile, markdown);
  console.log(`Report generated at: ${ctx.outputFile}`);

  if (ctx.failOnP0) {
    const p0Count = data.issues.filter((i: Issue) => i.labels.some(l => l.name === 'P0')).length;
    if (p0Count > 0) {
      console.error(`[FAIL] ${p0Count} P0 issues detected.`);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
