import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type PolicyStatus = 'pass' | 'fail' | 'warn';
export type PolicySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PolicyResult {
  policy_name: string;
  status: PolicyStatus;
  severity: PolicySeverity;
  evidence_ref: string;
}

function evaluateGuardrail(
  policyName: string,
  condition: boolean,
  severity: PolicySeverity,
  evidenceRef: string,
): PolicyResult {
  return {
    policy_name: policyName,
    status: condition ? 'pass' : 'fail',
    severity,
    evidence_ref: evidenceRef,
  };
}

export function runPolicyChecks(): PolicyResult[] {
  const forceFail = process.env.SUMMIT_OPA_PLACEHOLDER_FAIL === 'true';

  return [
    {
      policy_name: 'opa_placeholder_check',
      status: forceFail ? 'fail' : 'pass',
      severity: 'high',
      evidence_ref: 'governance/policy-check.ts#opa-placeholder',
    },
    evaluateGuardrail(
      'tool_registry_present',
      existsSync('governance/tool_registry.yaml'),
      'high',
      'governance/tool_registry.yaml',
    ),
    evaluateGuardrail(
      'governance_policy_catalog_present',
      existsSync('governance/policies'),
      'medium',
      'governance/policies',
    ),
  ];
}

export function hasBlockingPolicyFailures(results: PolicyResult[]): boolean {
  return results.some((result) => result.status === 'fail');
}

function parseArgs(argv: string[]): { outputPath?: string; enforce: boolean } {
  const outputFlagIndex = argv.indexOf('--output');
  const hasOutput = outputFlagIndex >= 0 && argv[outputFlagIndex + 1];
  return {
    outputPath: hasOutput ? argv[outputFlagIndex + 1] : undefined,
    enforce: argv.includes('--enforce'),
  };
}

function writeResultsIfRequested(
  outputPath: string | undefined,
  results: PolicyResult[],
): void {
  if (!outputPath) {
    return;
  }

  const absolutePath = resolve(outputPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, JSON.stringify(results, null, 2));
}

function runAsCli(): void {
  const args = parseArgs(process.argv.slice(2));
  const results = runPolicyChecks();

  writeResultsIfRequested(args.outputPath, results);
  console.log(JSON.stringify(results, null, 2));

  if (args.enforce && hasBlockingPolicyFailures(results)) {
    console.error('Policy checks failed. Blocking workflow.');
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runAsCli();
}
