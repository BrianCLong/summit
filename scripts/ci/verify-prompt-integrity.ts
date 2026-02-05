import path from 'node:path';
import { assertScopeCompliance, ensureHashMatches, getChangedFiles, getPromptByHash, loadPromptRegistry } from './lib/prompt-registry';

const GATE_CATALOG = 'docs/ga/GATE_FAILURE_CATALOG.md';

function gateError(summary: string, remediation: string[]): Error {
  const lines = [
    'GATE FAILURE: GATE-PROMPT-INTEGRITY',
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
  console.error('Usage: ts-node scripts/ci/verify-prompt-integrity.ts --prompt-hash <hash> [--registry <path>] [--diff-base <ref>]');
  process.exit(1);
}

function parseArgs(): { promptHash: string; registryPath?: string; diffBase?: string } {
  const args = process.argv.slice(2);
  let promptHash = process.env.PROMPT_HASH ?? '';
  let registryPath = process.env.PROMPT_REGISTRY;
  let diffBase = process.env.DIFF_BASE;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--prompt-hash') {
      promptHash = args[i + 1];
      i += 1;
    } else if (arg === '--registry') {
      registryPath = args[i + 1];
      i += 1;
    } else if (arg === '--diff-base') {
      diffBase = args[i + 1];
      i += 1;
    }
  }

  if (!promptHash) {
    usage();
  }

  return { promptHash, registryPath, diffBase };
}

function main(): void {
  const { promptHash, registryPath, diffBase } = parseArgs();
  const registry = loadPromptRegistry(registryPath ?? path.join('prompts', 'registry.yaml'));
  const prompt = getPromptByHash(registry, promptHash);

  if (!prompt) {
    throw gateError(`Prompt hash ${promptHash} not found in registry.`, [
      'Confirm the prompt hash exists in prompts/registry.yaml.',
      'Recompute the prompt hash if the prompt file changed.',
    ]);
  }

  try {
    ensureHashMatches(prompt);
  } catch (error) {
    throw gateError((error as Error).message, [
      `Update prompts/registry.yaml to match ${prompt.path}.`,
      'Recompute sha256 and re-run the gate.',
    ]);
  }

  const changedFiles = getChangedFiles(diffBase);
  try {
    assertScopeCompliance(prompt, changedFiles);
  } catch (error) {
    throw gateError((error as Error).message, [
      'Reduce the diff to the prompt scope paths.',
      'Or update the prompt scope in prompts/registry.yaml and re-run.',
    ]);
  }

  // eslint-disable-next-line no-console
  console.log(`Prompt integrity verified for ${prompt.id} with ${changedFiles.length} changed file(s).`);
}

main();
