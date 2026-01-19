import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildOpenLineageEvent,
  emitOpenLineageArtifact,
  stableStringify,
  validateOpenLineageEvent,
} from './openlineage.js';

describe('lineage emitter', () => {
  const baseInput = {
    jobName: 'summit-pipeline',
    runId: 'run-001',
    inputs: [
      { namespace: 'summit', name: 'b-dataset' },
      { namespace: 'summit', name: 'a-dataset' },
    ],
    outputs: [
      { namespace: 'summit', name: 'z-output' },
      { namespace: 'summit', name: 'm-output' },
    ],
  };

  it('canonicalizes events deterministically', async () => {
    const eventA = buildOpenLineageEvent(baseInput);
    const eventB = buildOpenLineageEvent({
      ...baseInput,
      inputs: [...baseInput.inputs].reverse(),
      outputs: [...baseInput.outputs].reverse(),
    });

    expect(stableStringify(eventA)).toEqual(stableStringify(eventB));
    await expect(validateOpenLineageEvent(eventA)).resolves.toBeUndefined();
  });

  it('emits a validated artifact to disk', async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'lineage-'));
    const artifact = await emitOpenLineageArtifact(baseInput, tempRoot);
    const payload = await readFile(artifact.path, 'utf-8');

    expect(JSON.parse(payload).run.runId).toBe('run-001');

    await rm(tempRoot, { recursive: true, force: true });
  });
});
