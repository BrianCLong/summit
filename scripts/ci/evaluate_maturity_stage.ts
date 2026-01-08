import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { load } from 'js-yaml';
import { z } from 'zod';
import { join, dirname } from 'path';

// --- Schema Definition ---

const GateLevel = z.string().refine(val => ['report_only', 'required'].includes(val));

const StageSchema = z.object({
  description: z.string(),
  gates: z.object({
    promotion_guard: GateLevel,
    deps_approval: GateLevel,
    policy_drift: GateLevel,
    field_budgets: GateLevel,
    observability_verify: GateLevel,
  }),
});

const MappingSchema = z.object({
  pattern: z.string(),
  stage: z.string(),
});

const PolicySchema = z.object({
  stages: z.record(z.string(), StageSchema),
  mappings: z.array(MappingSchema),
});

type Policy = z.infer<typeof PolicySchema>;

interface EvidenceResult {
  ok: boolean;
  code?: string;
  message?: string;
  [key: string]: any;
}

// --- Logic ---

function determineStage(tag: string, policy: Policy): string {
  for (const mapping of policy.mappings) {
    const regex = new RegExp(mapping.pattern);
    if (regex.test(tag)) {
      return mapping.stage;
    }
  }
  return 'PILOT'; // Default fallback, though regex .* should catch it
}

function checkEvidence(filepath: string | undefined): EvidenceResult {
  if (!filepath) {
    return { ok: false, code: 'MISSING_ARG', message: `Evidence path not provided` };
  }
  if (!existsSync(filepath)) {
    return { ok: false, code: 'MISSING_FILE', message: `Evidence file not found: ${filepath}` };
  }
  try {
    const content = readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (e: any) {
    return { ok: false, code: 'INVALID_JSON', message: `Error parsing JSON: ${e.message}` };
  }
}

function main() {
  const program = new Command();

  program
    .option('--policy <path>', 'Path to maturity-stages.yml', 'ci/maturity-stages.yml')
    .option('--tag <string>', 'Git tag or ref name')
    .option('--promotion-guard <path>', 'Path to promotion guard evidence')
    .option('--deps-approval <path>', 'Path to dependencies approval evidence')
    .option('--policy-drift <path>', 'Path to policy drift evidence')
    .option('--field-budgets <path>', 'Path to field budgets evidence')
    .option('--observability-verify <path>', 'Path to observability verify evidence')
    .option('--output-json <path>', 'Path to output JSON report', 'dist/maturity/maturity-eval.json')
    .option('--output-md <path>', 'Path to output Markdown report', 'dist/maturity/maturity-eval.md')
    .parse(process.argv);

  const options = program.opts();

  // 1. Load Policy
  if (!existsSync(options.policy)) {
    console.error(`Policy file not found: ${options.policy}`);
    process.exit(1);
  }
  const policyData = load(readFileSync(options.policy, 'utf8'));
  const policy = PolicySchema.parse(policyData);

  // 2. Determine Stage
  const tag = options.tag || process.env.GITHUB_REF_NAME || 'main';
  const stageName = determineStage(tag, policy);
  const stageConfig = policy.stages[stageName];

  if (!stageConfig) {
    console.error(`Stage configuration not found for: ${stageName}`);
    process.exit(1);
  }

  console.log(`Evaluating Maturity for Tag: ${tag} -> Stage: ${stageName}`);

  // 3. Evaluate Gates
  const evaluations: any[] = [];
  let overallPass = true;
  const blockingReasons: string[] = [];

  const checkGate = (gateName: keyof typeof stageConfig.gates, evidencePath: string | undefined) => {
    const requirement = stageConfig.gates[gateName];

    let evidence = { ok: true, message: 'Skipped (Report Only)' };
    let passed = true;

    if (evidencePath) {
        evidence = checkEvidence(evidencePath);
        passed = evidence.ok;
    } else if (requirement === 'required') {
        passed = false;
        evidence = { ok: false, code: 'MISSING_EVIDENCE', message: 'Required evidence not provided' };
    } else {
        // report_only and missing evidence
        passed = false;
        evidence = { ok: false, code: 'MISSING_EVIDENCE', message: 'Evidence missing (non-blocking)' };
    }

    const evalResult = {
      gate: gateName,
      requirement,
      passed,
      evidencePath,
      evidence,
      blocking: false,
    };

    if (!passed) {
      if (requirement === 'required') {
        overallPass = false;
        evalResult.blocking = true;
        blockingReasons.push(`${gateName}: ${evidence.code || 'FAILED'} (${evidence.message || 'Check failed'})`);
      }
    }

    evaluations.push(evalResult);
  };

  checkGate('promotion_guard', options.promotionGuard);
  checkGate('deps_approval', options.depsApproval);
  checkGate('policy_drift', options.policyDrift);
  checkGate('field_budgets', options.fieldBudgets);
  checkGate('observability_verify', options.observabilityVerify);

  // 4. Generate Report
  const report = {
    tag,
    stage: stageName,
    overallPass,
    blockingReasons,
    evaluations,
    timestamp: new Date().toISOString(),
  };

  // 5. Output
  const jsonOutput = JSON.stringify(report, null, 2);

  // Ensure output directory exists for BOTH files
  mkdirSync(dirname(options.outputJson), { recursive: true });
  mkdirSync(dirname(options.outputMd), { recursive: true });

  writeFileSync(options.outputJson, jsonOutput);

  // Markdown Report
  let mdOutput = `# Maturity Evaluation: ${stageName}\n\n`;
  mdOutput += `**Tag:** \`${tag}\`\n`;
  mdOutput += `**Status:** ${overallPass ? '✅ PASS' : '❌ FAIL'}\n\n`;

  if (blockingReasons.length > 0) {
    mdOutput += `### 🚫 Blocking Issues\n`;
    blockingReasons.forEach(reason => {
      mdOutput += `- ${reason}\n`;
    });
    mdOutput += `\n`;
  }

  mdOutput += `### Gate Detail\n\n`;
  mdOutput += `| Gate | Requirement | Status | Details |\n`;
  mdOutput += `|---|---|---|---|\n`;

  evaluations.forEach(ev => {
    const statusIcon = ev.passed ? '✅' : (ev.requirement === 'required' ? '❌' : '⚠️');
    mdOutput += `| ${ev.gate} | \`${ev.requirement}\` | ${statusIcon} | ${ev.evidence.message || ev.evidence.code || (ev.passed ? 'OK' : 'Failed')} |\n`;
  });

  writeFileSync(options.outputMd, mdOutput);

  console.log(JSON.stringify(report, null, 2));

  if (!overallPass) {
    console.error('Maturity evaluation FAILED.');
    process.exit(1);
  } else {
    console.log('Maturity evaluation PASSED.');
  }
}

main();
