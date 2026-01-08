import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PolicyEvaluator } from '../../server/src/policy/policyEvaluator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../');
const DIST_DIR = path.resolve(REPO_ROOT, 'dist/policy-evidence');
const VECTORS_DIR = path.resolve(REPO_ROOT, 'ci/policy-test-vectors');

// Ensure dist dir exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Ensure vectors dir exists (mock for now if empty)
if (!fs.existsSync(VECTORS_DIR)) {
  fs.mkdirSync(VECTORS_DIR, { recursive: true });
}

interface TestVector {
  name: string;
  context: any;
  expectedDecision?: 'ALLOW' | 'DENY';
}

// Default vectors if files don't exist yet
const DEFAULT_VECTORS: TestVector[] = [
  {
    name: 'GA promotion without evidence pack',
    context: {
      action: 'release.promotion.verify',
      targetEnv: 'ga',
      timestamp: '2025-06-02T12:00:00Z', // Monday, not frozen (Sunday was 2025-06-01)
      artifacts: ['release.tar.gz']
    },
    expectedDecision: 'DENY'
  },
  {
    name: 'GA promotion with evidence pack',
    context: {
      action: 'release.promotion.verify',
      targetEnv: 'ga',
      timestamp: '2025-06-02T12:00:00Z', // Monday
      artifacts: ['release.tar.gz', 'evidence.json']
    },
    expectedDecision: 'ALLOW'
  },
  {
    name: 'Freeze Active',
    context: {
      action: 'release.promotion.verify',
      targetEnv: 'rc',
      timestamp: '2025-12-31T23:59:00Z' // New Year freeze
    },
    expectedDecision: 'DENY'
  },
  {
    name: 'Sync Push Revoked',
    context: {
      action: 'sync.push',
      tenantId: 't1',
      userId: 'u1',
      deviceStatus: 'revoked'
    },
    expectedDecision: 'DENY'
  },
  {
    name: 'Attachment Size Limit',
    context: {
      action: 'sync.attachments.chunk',
      tenantId: 't1',
      dataSize: 20 * 1024 * 1024 // 20MB
    },
    expectedDecision: 'DENY'
  },
  {
     name: 'Localstore Rotate No Flag',
     context: {
         action: 'localstore.rotate',
         tenantId: 't1'
     },
     expectedDecision: 'DENY'
  }
];

async function main() {
  console.log('Building Policy Evidence Report...');
  const evaluator = PolicyEvaluator.getInstance();

  const results: any[] = [];
  let failedTests = 0;

  // Load vectors from files + defaults
  // For now just use defaults to bootstrap
  const vectors = [...DEFAULT_VECTORS];

  for (const vector of vectors) {
    console.log(`Evaluating: ${vector.name}`);
    const decision = evaluator.evaluate(vector.context);

    const result = {
      name: vector.name,
      context: vector.context,
      decision: decision,
      pass: !vector.expectedDecision || decision.decision === vector.expectedDecision
    };

    results.push(result);
    if (!result.pass) {
      console.error(`FAILED: ${vector.name} - Expected ${vector.expectedDecision}, got ${decision.decision}`);
      failedTests++;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    evaluatorVersion: '1.0.0',
    summary: {
      total: results.length,
      passed: results.length - failedTests,
      failed: failedTests
    },
    results
  };

  const jsonPath = path.join(DIST_DIR, 'policy-evidence.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`Wrote JSON report to ${jsonPath}`);

  // Generate Markdown
  const mdPath = path.join(DIST_DIR, 'policy-evidence.md');
  const mdContent = `
# Policy Evidence Report

**Generated At:** ${report.generatedAt}
**Evaluator Version:** ${report.evaluatorVersion}

## Summary
- **Total:** ${report.summary.total}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}

## Results

| Name | Decision | Reason | Pass |
|------|----------|--------|------|
${results.map(r => `| ${r.name} | ${r.decision.decision} | ${r.decision.reasonCode} | ${r.pass ? '✅' : '❌'} |`).join('\n')}

## Details

${results.map(r => `
### ${r.name}
- **Action:** \`${r.context.action}\`
- **Context:**
  \`\`\`json
  ${JSON.stringify(r.context, null, 2)}
  \`\`\`
- **Result:**
  \`\`\`json
  ${JSON.stringify(r.decision, null, 2)}
  \`\`\`
`).join('\n')}
`;

  fs.writeFileSync(mdPath, mdContent);
  console.log(`Wrote MD report to ${mdPath}`);

  if (failedTests > 0) {
    console.error(`Report generation failed with ${failedTests} failing vectors.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
