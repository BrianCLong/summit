import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import {
  ArtifactInput,
  Signer,
  SparRegistry,
  replayManifest,
  stableStringify,
} from '../src';

class TestSigner implements Signer {
  constructor(
    private readonly secret: string,
    public readonly id: string,
  ) {}

  sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload);
    return expected === signature;
  }
}

function buildInput(overrides: Partial<ArtifactInput> = {}): ArtifactInput {
  const base: ArtifactInput = {
    templateId: 'summit-demo',
    promptTemplate: 'Summarise: {{text}}',
    inputs: { text: 'Secure reproducibility matters.' },
    toolTraces: [
      {
        toolName: 'retriever',
        input: { query: 'reproducibility' },
        output: { documents: 5 },
        timestamp: '2024-06-01T12:00:00.000Z',
      },
    ],
    output: 'Reproducibility ensures identical outcomes.',
    policyTags: ['restricted', 'llm-output'],
    metadata: {
      model: 'gpt-4.5-secure',
      parameters: { temperature: 0, max_tokens: 128 },
      tools: [
        {
          name: 'retriever',
          version: '1.2.3',
          description: 'Semantic vector retriever',
        },
      ],
    },
  };

  return {
    ...base,
    ...overrides,
    inputs: overrides.inputs ?? base.inputs,
    toolTraces: overrides.toolTraces ?? base.toolTraces,
    policyTags: overrides.policyTags ?? base.policyTags,
    metadata: overrides.metadata ?? base.metadata,
  };
}

describe('SparRegistry', () => {
  let tempDir: string;
  let registry: SparRegistry;
  const signer = new TestSigner('registry-secret', 'signer-1');

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spar-registry-'));
    registry = new SparRegistry(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('registers artifacts with stable hashes and produces reproducible manifests', () => {
    const artifact = registry.registerArtifact(buildInput(), signer);

    expect(artifact.id).toBe('summit-demo:v1');
    expect(artifact.hash).toHaveLength(64);
    expect(registry.verifyArtifact(artifact.id, signer)).toBe(true);

    const manifest = registry.exportManifest(artifact.id);
    const replayed = replayManifest(manifest, signer);

    const stored = registry.getArtifact(artifact.id);
    const storedCanonical = stableStringify({
      promptTemplate: stored.promptTemplate,
      inputs: stored.inputs,
      toolTraces: stored.toolTraces,
      output: stored.output,
      metadata: stored.metadata,
      policyTags: stored.policyTags,
    });

    expect(replayed.hash).toBe(manifest.hash);
    expect(replayed.canonical).toBe(storedCanonical);
    expect(registry.replayManifest(manifest, signer)).toBe(true);
  });

  it('increments versions immutably and isolates diffs to true changes', () => {
    const first = registry.registerArtifact(buildInput(), signer);
    const secondInput = buildInput({
      output: 'Reproducibility guarantees byte-identical outputs.',
      metadata: {
        model: 'gpt-4.5-secure',
        parameters: { temperature: 0.1, max_tokens: 128 },
        tools: [
          {
            name: 'retriever',
            version: '1.2.3',
            description: 'Semantic vector retriever',
          },
        ],
      },
    });
    const second = registry.registerArtifact(secondInput, signer);

    expect(second.version).toBe(first.version + 1);
    expect(first.id).toBe('summit-demo:v1');
    expect(second.id).toBe('summit-demo:v2');

    const diffs = registry.diffArtifacts(first.id, second.id);
    expect(diffs).toEqual([
      {
        path: 'metadata.parameters.temperature',
        before: 0,
        after: 0.1,
      },
      {
        path: 'output',
        before: 'Reproducibility ensures identical outcomes.',
        after: 'Reproducibility guarantees byte-identical outputs.',
      },
    ]);
  });

  it('deduplicates identical artifacts via hash comparison', () => {
    const a = registry.registerArtifact(buildInput(), signer);
    const b = registry.registerArtifact(buildInput(), signer);
    expect(b.id).toBe(a.id);
    expect(registry.listArtifacts().length).toBe(1);
  });

  it('detects tampering when manifest data is altered', () => {
    const artifact = registry.registerArtifact(buildInput(), signer);
    const manifest = registry.exportManifest(artifact.id);
    manifest.output = 'tampered';

    expect(() => replayManifest(manifest, signer)).toThrowError(
      /hash mismatch/i,
    );
  });
});
