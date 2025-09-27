import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

export interface PlanStep {
  index: number;
  kind: 'checkpoint' | 'rotate' | 'verify';
  keyId?: string;
  phase?: 'pre' | 'post';
  description: string;
  affectedAssets?: string[];
  dependencyHints?: string[];
}

export interface RotationPlan {
  steps: PlanStep[];
  coverageTargets: Record<string, string[]>;
  fingerprint: string;
  dependencyGraph: Record<string, string[]>;
  assetDependencies: Record<string, string[]>;
}

export interface AssetCoverage {
  assetId: string;
  keys: string[];
  status: string;
}

export interface CoverageProof {
  assets: AssetCoverage[];
}

export interface StepResult {
  stepIndex: number;
  kind: PlanStep['kind'];
  keyId?: string;
  phase?: 'pre' | 'post';
  status: string;
  notes?: string[];
}

export interface ExecutionReceipt {
  planFingerprint: string;
  stepResults: StepResult[];
  coverage: CoverageProof;
}

export interface RenderOptions {
  includeDependencyHints?: boolean;
}

export function renderPlan(plan: RotationPlan, receipt: ExecutionReceipt, options: RenderOptions = {}): string {
  const lines: string[] = [];
  lines.push(`KRPCP rotation plan fingerprint ${plan.fingerprint}`);
  lines.push('');
  lines.push('Steps:');
  for (const step of plan.steps) {
    const result = receipt.stepResults.find((entry) => entry.stepIndex === step.index);
    const status = result ? result.status : 'pending';
    const header = `  [${step.index.toString().padStart(2, '0')}] ${step.kind.toUpperCase()} ${step.keyId ?? ''}`.trimEnd();
    lines.push(`${header} :: ${step.description} -> ${status}`);
    if (step.affectedAssets && step.affectedAssets.length > 0) {
      lines.push(`      assets: ${step.affectedAssets.join(', ')}`);
    }
    if (options.includeDependencyHints && step.dependencyHints && step.dependencyHints.length > 0) {
      lines.push(`      dependencies: ${step.dependencyHints.join(', ')}`);
    }
  }
  lines.push('');
  lines.push('Coverage proof:');
  for (const asset of receipt.coverage.assets) {
    lines.push(`  - ${asset.assetId} :: ${asset.status} (keys: ${asset.keys.join(', ')})`);
  }
  return lines.join('\n');
}

function loadJson<T>(targetPath: string): T {
  const data = readFileSync(targetPath, 'utf-8');
  return JSON.parse(data) as T;
}

function main(): void {
  const [, , planPath = 'plan.json', receiptPath = 'receipt.json'] = process.argv;
  const plan = loadJson<RotationPlan>(planPath);
  const receipt = loadJson<ExecutionReceipt>(receiptPath);
  const output = renderPlan(plan, receipt, { includeDependencyHints: true });
  process.stdout.write(`${output}\n`);
}

const entrypoint = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] ?? '') === entrypoint) {
  main();
}
