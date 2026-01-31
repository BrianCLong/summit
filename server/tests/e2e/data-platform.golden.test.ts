import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import {
  createDataPlatformHarness,
  loadFixtureText,
} from '../helpers/dataPlatformHarness.js';

describe('Data & Knowledge Platform golden path', () => {
  it('ingests, retrieves, and answers with cited evidence', async () => {
    const harness = createDataPlatformHarness();
    const fixturePath = path.join(
      'fixtures',
      'data-platform',
      'golden-brief.md',
    );
    const fixtureText = await loadFixtureText(fixturePath);

    const { chunks } = await harness.ingestDocument('golden-doc', fixtureText);
    expect(chunks).toHaveLength(3);

    const persisted = await harness.chunkStore.listChunks('golden-doc');
    expect(persisted.map((chunk) => chunk.id).sort()).toEqual(
      chunks.map((chunk) => chunk.id).sort(),
    );

    const powerChunk = chunks.find((chunk) =>
      chunk.text.toLowerCase().includes('solar power'),
    );
    expect(powerChunk).toBeDefined();

    const retrieval = await harness.retrieve(
      'How is the sensor network kept powered in the field?',
      2,
    );

    expect(retrieval.matches.length).toBeGreaterThan(0);
    expect(retrieval.chunkIds).toContain(powerChunk!.id);
    expect(retrieval.matches[0]?.chunkId).toBe(powerChunk!.id);

    const rag = await harness.ragAnswer(
      'How is the sensor network kept powered in the field?',
      retrieval,
    );

    expect(rag.citations.map((cite) => cite.chunkId)).toEqual(
      expect.arrayContaining(retrieval.chunkIds),
    );
    expect(rag.citations.length).toBe(retrieval.matches.length);
    expect(rag.answer).toContain(`[${powerChunk!.id}]`);
  });
});
