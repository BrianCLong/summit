import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { parse } from 'yaml';
import { loadPolicyFromFile } from '../../agentic/procedures/policy/loadPolicy';
import { loadProcedureFromFile } from '../../agentic/procedures/loader';
import { validateProcedure } from '../../agentic/procedures/validator/validate';
import { compileProcedure, serializePlan } from '../../agentic/procedures/compiler/compile';

const repoRoot = resolve(process.cwd());
const policyPath = resolve(
  repoRoot,
  'agentic',
  'procedures',
  'policy',
  'default.policy.yaml',
);
const standardsPath = resolve(
  repoRoot,
  'docs',
  'standards',
  'ctech-spring-active-software.md',
);
const examplesDir = resolve(repoRoot, 'procedures', 'examples');
const evidenceDir = resolve(repoRoot, 'evidence', 'agentic-procedures-drift');
const reportPath = resolve(evidenceDir, 'report.json');

function getGitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function extractAllowlistDoc(contents: string): {
  allowlist: {
    stepTypes: string[];
    httpDomains: string[];
    exportDestinations: { csv: string[] };
  };
} {
  const match = contents.match(/```yaml\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error('Allowlist registry block not found in standards doc.');
  }
  return parse(match[1]) as {
    allowlist: {
      stepTypes: string[];
      httpDomains: string[];
      exportDestinations: { csv: string[] };
    };
  };
}

function diffList(policyList: string[], docList: string[]): string[] {
  return policyList.filter(item => !docList.includes(item));
}

async function runDriftCheck(): Promise<number> {
  const policy = await loadPolicyFromFile(policyPath);
  const standards = await readFile(standardsPath, 'utf8');
  const docAllowlist = extractAllowlistDoc(standards).allowlist;

  const missingStepTypes = diffList(policy.allow.stepTypes, docAllowlist.stepTypes);
  const missingDomains = diffList(policy.allow.httpDomains, docAllowlist.httpDomains);
  const missingExports = diffList(
    policy.allow.exportDestinations.csv,
    docAllowlist.exportDestinations.csv,
  );

  const files = (await readdir(examplesDir))
    .filter(file => file.endsWith('.yaml'))
    .sort((left, right) => left.localeCompare(right));

  const validationFailures: string[] = [];
  const goldenDrift: string[] = [];

  for (const file of files) {
    const procedurePath = resolve(examplesDir, file);
    const procedure = await loadProcedureFromFile(procedurePath);
    try {
      validateProcedure(procedure, policy);
    } catch (error) {
      validationFailures.push(
        `${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const plan = compileProcedure(procedure);
    const serialized = serializePlan(plan);
    const goldenPath = procedurePath.replace(/\.ya?ml$/, '.plan.json');
    const golden = await readFile(goldenPath, 'utf8');
    if (serialized !== golden) {
      goldenDrift.push(file);
    }
  }

  const report = {
    gitSha: getGitSha(),
    allowlistDrift: {
      stepTypes: missingStepTypes,
      httpDomains: missingDomains,
      exportDestinations: missingExports,
    },
    validationFailures,
    goldenDrift,
    status:
      missingStepTypes.length === 0 &&
      missingDomains.length === 0 &&
      missingExports.length === 0 &&
      validationFailures.length === 0 &&
      goldenDrift.length === 0
        ? 'clean'
        : 'drift-detected',
  };

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'clean') {
    console.error('Procedure drift detected.');
    console.error(JSON.stringify(report, null, 2));
    return 1;
  }

  console.log('No procedure drift detected.');
  return 0;
}

runDriftCheck()
  .then(code => {
    process.exitCode = code;
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
