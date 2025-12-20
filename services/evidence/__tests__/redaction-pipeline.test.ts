import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  FileSystemDerivativeStore,
  InMemoryEvidenceStore,
  RedactionPipeline,
  RedactionProvenanceLedger,
  type RedactionInstructions,
} from '../redaction-pipeline';

describe('RedactionPipeline', () => {
  const originalFlag = process.env.REDACTION_PIPELINE;
  let tmpDir: string;

  beforeAll(() => {
    process.env.REDACTION_PIPELINE = '1';
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'redaction-'));
  });

  afterEach(async () => {
    jest.useRealTimers();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env.REDACTION_PIPELINE = originalFlag;
  });

  const buildPipeline = () => {
    const evidenceStore = new InMemoryEvidenceStore();
    const derivativeStore = new FileSystemDerivativeStore(tmpDir);
    const ledger = new RedactionProvenanceLedger();
    const pipeline = new RedactionPipeline({
      evidenceStore,
      derivativeStore,
      provenanceLedger: ledger,
      clock: () => new Date('2025-01-01T00:00:00.000Z'),
    });
    return { pipeline, evidenceStore, derivativeStore, ledger };
  };

  it('creates deterministic derivatives with overlays, hashes, and provenance links', async () => {
    const { pipeline, evidenceStore, ledger } = buildPipeline();
    const content =
      'Page 1: Secret Alpha should be hidden.\n---PAGE BREAK---\nPage 2: Call me at 555-1234 for details.';

    evidenceStore.add({
      id: 'evidence-1',
      mimeType: 'text/plain',
      content: Buffer.from(content),
      createdAt: '2024-12-01T12:00:00.000Z',
    });

    const instructions: RedactionInstructions = {
      textSpans: [
        {
          start: content.indexOf('Secret'),
          end: content.indexOf('Secret') + 'Secret'.length,
          label: 'classified-term',
        },
        {
          start: content.indexOf('555'),
          end: content.indexOf('555') + '555-1234'.length,
          label: 'phone',
        },
      ],
      boundingBoxes: [
        { page: 1, x: 10, y: 20, width: 200, height: 40, label: 'face' },
        { page: 2, x: 5, y: 5, width: 180, height: 30 },
      ],
    };

    const first = await pipeline.applyRedaction({
      evidenceId: 'evidence-1',
      instructions,
      reasonCode: 'casework:redaction-needed',
      actor: { id: 'analyst-9', role: 'analyst' },
    });

    expect(first.artifact.redactedContent).not.toEqual(content);
    expect(first.artifact.overlay.overlays.textSpans).toHaveLength(2);
    expect(first.artifact.overlay.overlays.pages).toHaveLength(2);
    expect(first.artifact.snippetHashes).toHaveLength(4);
    expect(first.artifact.overlay.instructionsVersion).toBe(1);
    expect(first.artifact.cacheKey).toContain(first.artifact.artifactId);
    expect(first.artifact.storagePath).toMatch(/evidence-1/);

    const saved = JSON.parse(await fs.readFile(first.artifact.storagePath, 'utf8'));
    expect(saved.artifactId).toBe(first.artifact.artifactId);
    expect(saved.overlay.overlays.textSpans[0].hash).toBe(first.artifact.overlay.overlays.textSpans[0].hash);

    const provenance = ledger.get(first.artifact.artifactId);
    expect(provenance).toMatchObject({
      derivativeId: first.artifact.artifactId,
      evidenceId: 'evidence-1',
      redactedBy: 'analyst-9',
      reasonCode: 'casework:redaction-needed',
      instructionsVersion: 1,
      timestamp: '2025-01-01T00:00:00.000Z',
    });

    const repeat = await pipeline.applyRedaction({
      evidenceId: 'evidence-1',
      instructions,
      reasonCode: 'casework:redaction-needed',
      actor: { id: 'analyst-9', role: 'analyst' },
    });

    expect(repeat.artifact.artifactId).toBe(first.artifact.artifactId);
    expect(repeat.artifact.redactedContent).toBe(first.artifact.redactedContent);
    expect(repeat.provenance.instructionsVersion).toBe(1);
  });

  it('increments instruction versions for new spans while keeping originals immutable', async () => {
    const { pipeline, evidenceStore } = buildPipeline();
    const content = 'Page 1: Secret Alpha.\nPage 2: Confidential Beta.';

    evidenceStore.add({
      id: 'evidence-2',
      mimeType: 'text/plain',
      content: Buffer.from(content),
      createdAt: '2024-12-01T12:00:00.000Z',
    });

    const baseInstructions: RedactionInstructions = {
      textSpans: [{ start: 8, end: 14 }],
      boundingBoxes: [],
    };

    const first = await pipeline.applyRedaction({
      evidenceId: 'evidence-2',
      instructions: baseInstructions,
      reasonCode: 'policy:mask-alpha',
      actor: { id: 'auditor-1', role: 'auditor' },
    });

    const newInstructions: RedactionInstructions = {
      textSpans: [
        ...baseInstructions.textSpans,
        {
          start: content.indexOf('Confidential'),
          end: content.indexOf('Confidential') + 'Confidential'.length,
        },
      ],
      boundingBoxes: [{ page: 1, x: 0, y: 0, width: 50, height: 10 }],
    };

    const second = await pipeline.applyRedaction({
      evidenceId: 'evidence-2',
      instructions: newInstructions,
      reasonCode: 'policy:mask-alpha-and-beta',
      actor: { id: 'auditor-1', role: 'auditor' },
    });

    expect(second.artifact.version).toBeGreaterThan(first.artifact.version);
    expect(second.artifact.redactedContent).not.toEqual(first.artifact.redactedContent);
    expect(Buffer.from(content).toString('utf8')).toBe(content);
  });

  it('enforces role-based permissions when the pipeline flag is enabled', async () => {
    const { pipeline, evidenceStore } = buildPipeline();
    evidenceStore.add({
      id: 'evidence-3',
      mimeType: 'text/plain',
      content: Buffer.from('Sensitive line'),
      createdAt: '2024-12-01T12:00:00.000Z',
    });

    await expect(
      pipeline.applyRedaction({
        evidenceId: 'evidence-3',
        instructions: { textSpans: [{ start: 0, end: 9 }], boundingBoxes: [] },
        reasonCode: 'policy:test',
        actor: { id: 'viewer-7', role: 'viewer' },
      }),
    ).rejects.toThrow('Role viewer is not permitted to perform redactions');
  });
});
