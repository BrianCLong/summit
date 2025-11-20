import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { validateModelCard } from './validator.js';
import { canonicalize } from './canonical.js';
import { signCanonicalPayload } from './signer.js';
import { CompiledModelCard, CompileOptions, CompileResult, ModelCardInput } from './types.js';

function hashSource(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

function toCompiledCard(
  input: ModelCardInput,
  options: CompileOptions,
  sourceHash: string
): Omit<CompiledModelCard, 'signature'> {
  const now = (options.now ?? new Date()).toISOString();
  return {
    metadata: {
      modelId: input.modelId,
      version: input.version,
      owner: input.owner,
      compiledAt: now,
      sourceHash,
    },
    description: input.description,
    metrics: input.metrics,
    intendedUse: input.intendedUse,
    dataLineage: input.dataLineage,
    risk: {
      ...input.risk,
      outOfScopePurposes: input.risk.outOfScopePurposes ?? [],
    },
    enforcement: {
      allowedPurposes: input.intendedUse.supportedPurposes,
      deniedPurposes: input.risk.outOfScopePurposes ?? [],
    },
  };
}

export function compileModelCardFromFile(
  yamlPath: string,
  outputPath: string | undefined,
  options: CompileOptions
): CompileResult {
  const raw = readFileSync(yamlPath, 'utf8');
  const parsed = parse(raw);
  const validated = validateModelCard(parsed);
  return compileModelCard(validated, raw, outputPath, options);
}

export function compileModelCard(
  input: ModelCardInput,
  rawSource: string,
  outputPath: string | undefined,
  options: CompileOptions
): CompileResult {
  const sourceHash = hashSource(rawSource);
  const compiled = toCompiledCard(input, options, sourceHash);
  const canonicalPayload = canonicalize({
    metadata: compiled.metadata,
    description: compiled.description,
    metrics: compiled.metrics,
    intendedUse: compiled.intendedUse,
    dataLineage: compiled.dataLineage,
    risk: compiled.risk,
    enforcement: compiled.enforcement,
  });
  const signature = signCanonicalPayload(canonicalPayload, options.privateKeyPath, options.publicKeyPath);

  const card: CompiledModelCard = {
    ...compiled,
    signature,
  };

  if (outputPath) {
    writeFileSync(outputPath, JSON.stringify(card, null, 2), 'utf8');
  }

  return { card, canonicalPayload };
}
