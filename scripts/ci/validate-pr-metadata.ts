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
    throw new Error('Agent metadata markers not found in PR body.');
  }

  const snippet = body.substring(startIndex + startMarker.length, endIndex).trim();
  const codeFenceStart = snippet.indexOf('```');
  const codeFenceEnd = snippet.lastIndexOf('```');

  if (codeFenceStart === -1 || codeFenceEnd === -1 || codeFenceEnd <= codeFenceStart) {
    throw new Error('Agent metadata block must be wrapped in fenced JSON.');
  }

  const metadataBlock = snippet.substring(codeFenceStart + 3, codeFenceEnd).trim();
  const normalizedBlock = metadataBlock.replace(/^\s*json\s*\n/i, '');
  const parsed = JSON.parse(normalizedBlock) as AgentMetadata;

  return parsed;
}

function validateMetadataShape(metadata: AgentMetadata): void {
  const requiredStringFields: (keyof AgentMetadata)[] = ['agent_id', 'task_id', 'prompt_hash'];
  requiredStringFields.forEach((field) => {
    if (!metadata[field] || typeof metadata[field] !== 'string') {
      throw new Error(`Missing or invalid required field: ${field}`);
    }
  });

  if (!Array.isArray(metadata.domains) || metadata.domains.length === 0) {
    throw new Error('domains must be a non-empty array');
  }

  if (!Array.isArray(metadata.verification_tiers) || metadata.verification_tiers.length === 0) {
    throw new Error('verification_tiers must be a non-empty array');
  }

  if (typeof metadata.debt_delta !== 'number') {
    throw new Error('debt_delta must be a number');
  }

  if (!metadata.declared_scope || !Array.isArray(metadata.declared_scope.paths) || metadata.declared_scope.paths.length === 0) {
    throw new Error('declared_scope.paths must list the touched areas');
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
    throw new Error(`Prompt hash ${metadata.prompt_hash} not found in registry.`);
  }

  ensureHashMatches(prompt);
  assertScopeCompliance(prompt, metadata.declared_scope.paths);

  const changedFiles = getChangedFiles(process.env.DIFF_BASE);
  const declaredPaths = metadata.declared_scope.paths;
  const diffViolations = changedFiles.filter((file) => !declaredPaths.some((allowed) => file.startsWith(allowed)));

  if (diffViolations.length > 0) {
    const message = diffViolations.map((file) => `- ${file}`).join('\n');
    throw new Error(`PR diff exceeds declared scope:\n${message}`);
  }

  if (prompt.scope?.domains && metadata.domains.some((domain) => !prompt.scope.domains?.includes(domain))) {
    throw new Error('Metadata domains must be contained within prompt scope domains.');
  }

  writeExecutionRecord(metadata, prompt.id, outputPath);
  // eslint-disable-next-line no-console
  console.log(`PR metadata validated for task ${metadata.task_id}.`);
}

main();
