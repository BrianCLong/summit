import fs from 'node:fs';
import path from 'node:path';
import { assertScopeCompliance, ensureHashMatches, getChangedFiles, getPromptByHash, loadPromptRegistry } from './lib/prompt-registry';

type AgentMetadata = {
  agent_id: string;
  task_id: string;
  prompt_hash: string;
  domains: string[];
  verification_tiers: string[];
  debt_delta: number;
  declared_scope: { paths: string[]; domains?: string[] };
  allowed_operations?: string[];
};

const GATE_CATALOG = 'docs/ga/GATE_FAILURE_CATALOG.md';
const PR_TEMPLATE = '.github/PULL_REQUEST_TEMPLATE.md';

function gateError(gateId: string, summary: string, remediation: string[]): Error {
  const lines = [
    `GATE FAILURE: ${gateId}`,
    summary,
    '',
    'Remediation:',
    ...remediation.map((step) => `- ${step}`),
    '',
    `Reference: ${GATE_CATALOG}`,
  ];
  return new Error(lines.join('\n'));
}

function usage(): never {
  // eslint-disable-next-line no-console
  console.error('Usage: ts-node scripts/ci/validate-pr-metadata.ts --body <path> [--registry <path>] [--output <artifact>]');
  process.exit(1);
}

function parseArgs(): { bodyPath: string; registryPath?: string; outputPath?: string } {
  const args = process.argv.slice(2);
  let bodyPath = process.env.PR_BODY_PATH ?? '';
  let registryPath = process.env.PROMPT_REGISTRY;
  let outputPath = process.env.AGENT_RUN_ARTIFACT;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--body') {
      bodyPath = args[i + 1];
      i += 1;
    } else if (arg === '--registry') {
      registryPath = args[i + 1];
      i += 1;
    } else if (arg === '--output') {
      outputPath = args[i + 1];
      i += 1;
    }
  }

  if (!bodyPath) {
    usage();
  }

  return { bodyPath, registryPath, outputPath };
}

function extractMetadata(body: string): AgentMetadata {
  const startMarker = '<!-- AGENT-METADATA:START -->';
  const endMarker = '<!-- AGENT-METADATA:END -->';
  const startIndex = body.indexOf(startMarker);
  const endIndex = body.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw gateError('GATE-PR-METADATA', 'Agent metadata markers not found in PR body.', [
      `Add the AGENT-METADATA block from ${PR_TEMPLATE}.`,
      'Ensure the block is present between <!-- AGENT-METADATA:START --> and <!-- AGENT-METADATA:END -->.',
    ]);
  }

  const snippet = body.substring(startIndex + startMarker.length, endIndex).trim();
  const codeFenceStart = snippet.indexOf('```');
  const codeFenceEnd = snippet.lastIndexOf('```');

  if (codeFenceStart === -1 || codeFenceEnd === -1 || codeFenceEnd <= codeFenceStart) {
    throw gateError('GATE-PR-METADATA', 'Agent metadata block must be wrapped in fenced JSON.', [
      'Wrap the metadata JSON in triple backticks.',
      `Follow the JSON template in ${PR_TEMPLATE}.`,
    ]);
  }

  const metadataBlock = snippet.substring(codeFenceStart + 3, codeFenceEnd).trim();
  const parsed = JSON.parse(metadataBlock) as AgentMetadata;

  return parsed;
}

function validateMetadataShape(metadata: AgentMetadata): void {
  const requiredStringFields: (keyof AgentMetadata)[] = ['agent_id', 'task_id', 'prompt_hash'];
  requiredStringFields.forEach((field) => {
    if (!metadata[field] || typeof metadata[field] !== 'string') {
      throw gateError('GATE-PR-METADATA', `Missing or invalid required field: ${field}`, [
        `Populate ${field} in the metadata JSON.`,
        `Validate the full template in ${PR_TEMPLATE}.`,
      ]);
    }
  });

  if (!Array.isArray(metadata.domains) || metadata.domains.length === 0) {
    throw gateError('GATE-PR-METADATA', 'domains must be a non-empty array.', [
      'List all impacted domains for this change in metadata.domains.',
      `Validate the template in ${PR_TEMPLATE}.`,
    ]);
  }

  if (!Array.isArray(metadata.verification_tiers) || metadata.verification_tiers.length === 0) {
    throw gateError('GATE-PR-METADATA', 'verification_tiers must be a non-empty array.', [
      'Declare required verification tiers (A/B/C) for this change.',
      `Validate the template in ${PR_TEMPLATE}.`,
    ]);
  }

  if (typeof metadata.debt_delta !== 'number') {
    throw gateError('GATE-PR-METADATA', 'debt_delta must be a number.', [
      'Provide a numeric debt_delta in metadata.',
      `Validate the template in ${PR_TEMPLATE}.`,
    ]);
  }

  if (!metadata.declared_scope || !Array.isArray(metadata.declared_scope.paths) || metadata.declared_scope.paths.length === 0) {
    throw gateError('GATE-PR-METADATA', 'declared_scope.paths must list the touched areas.', [
      'List the allowed path prefixes touched by this change.',
      `Validate the template in ${PR_TEMPLATE}.`,
    ]);
  }
}

function writeExecutionRecord(metadata: AgentMetadata, promptId: string, outputPath?: string): void {
  if (!outputPath) {
    return;
  }
  const absolute = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const record = {
    ...metadata,
    prompt_id: promptId,
    recorded_at: new Date().toISOString(),
  };
  fs.writeFileSync(absolute, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Execution record written to ${absolute}`);
}

function main(): void {
  const { bodyPath, registryPath, outputPath } = parseArgs();
  const body = fs.readFileSync(path.resolve(bodyPath), 'utf8');
  const metadata = extractMetadata(body);
  validateMetadataShape(metadata);

  const registry = loadPromptRegistry(registryPath ?? path.join('prompts', 'registry.yaml'));
  const prompt = getPromptByHash(registry, metadata.prompt_hash);

  if (!prompt) {
    throw gateError('GATE-PROMPT-INTEGRITY', `Prompt hash ${metadata.prompt_hash} not found in registry.`, [
      'Confirm the prompt hash exists in prompts/registry.yaml.',
      'Recompute the prompt hash if the prompt file changed.',
    ]);
  }

  try {
    ensureHashMatches(prompt);
  } catch (error) {
    throw gateError('GATE-PROMPT-INTEGRITY', (error as Error).message, [
      `Update prompts/registry.yaml to match ${prompt.path}.`,
      'Recompute sha256 and re-run the gate.',
    ]);
  }

  try {
    assertScopeCompliance(prompt, metadata.declared_scope.paths);
  } catch (error) {
    throw gateError('GATE-PROMPT-INTEGRITY', (error as Error).message, [
      'Align declared_scope.paths with the prompt scope in prompts/registry.yaml.',
      'Reduce PR changes or update the prompt scope and re-run.',
    ]);
  }

  const changedFiles = getChangedFiles(process.env.DIFF_BASE);
  const declaredPaths = metadata.declared_scope.paths;
  const diffViolations = changedFiles.filter((file) => !declaredPaths.some((allowed) => file.startsWith(allowed)));

  if (diffViolations.length > 0) {
    const message = diffViolations.map((file) => `- ${file}`).join('\n');
    throw gateError('GATE-PR-METADATA', `PR diff exceeds declared scope:\n${message}`, [
      'Update declared_scope.paths to include the touched paths.',
      'Or reduce the diff to match the declared scope.',
    ]);
  }

  if (prompt.scope?.domains && metadata.domains.some((domain) => !prompt.scope.domains?.includes(domain))) {
    throw gateError('GATE-PROMPT-INTEGRITY', 'Metadata domains must be contained within prompt scope domains.', [
      'Remove domains not covered by the prompt scope.',
      'Or update the prompt scope in prompts/registry.yaml and re-run.',
    ]);
  }

  writeExecutionRecord(metadata, prompt.id, outputPath);
  // eslint-disable-next-line no-console
  console.log(`PR metadata validated for task ${metadata.task_id}.`);
}

main();
