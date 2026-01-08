import path from "node:path";
import {
  assertScopeCompliance,
  ensureHashMatches,
  getChangedFiles,
  getPromptByHash,
  loadPromptRegistry,
} from "./lib/prompt-registry";

function usage(): never {
  // eslint-disable-next-line no-console
  console.error(
    "Usage: ts-node scripts/ci/verify-prompt-integrity.ts --prompt-hash <hash> [--registry <path>] [--diff-base <ref>]"
  );
  process.exit(1);
}

function parseArgs(): { promptHash: string; registryPath?: string; diffBase?: string } {
  const args = process.argv.slice(2);
  let promptHash = process.env.PROMPT_HASH ?? "";
  let registryPath = process.env.PROMPT_REGISTRY;
  let diffBase = process.env.DIFF_BASE;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--prompt-hash") {
      promptHash = args[i + 1];
      i += 1;
    } else if (arg === "--registry") {
      registryPath = args[i + 1];
      i += 1;
    } else if (arg === "--diff-base") {
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
  const registry = loadPromptRegistry(registryPath ?? path.join("prompts", "registry.yaml"));
  const prompt = getPromptByHash(registry, promptHash);

  if (!prompt) {
    throw new Error(`Prompt hash ${promptHash} not found in registry.`);
  }

  ensureHashMatches(prompt);
  const changedFiles = getChangedFiles(diffBase);
  assertScopeCompliance(prompt, changedFiles);

  // eslint-disable-next-line no-console
  console.log(
    `Prompt integrity verified for ${prompt.id} with ${changedFiles.length} changed file(s).`
  );
}

main();
