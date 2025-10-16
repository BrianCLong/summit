import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { KnowledgePurgeReindexOrchestrator } from '../kpro.js';
import {
  InMemoryChunkStore,
  SimpleTextChunkingStrategy,
} from '../chunk/chunkStore.js';
import { JsonlAuditLog } from '../audit/auditLog.js';
import { InMemoryCacheInvalidator } from '../cache/cacheInvalidator.js';
import type { VectorStoreAdapter } from '../adapters/vectorStoreAdapter.js';
import type {
  DocumentRecord,
  ForgetRequest,
  ReplayContext,
  VectorDocument,
} from '../types.js';

describe('KnowledgePurgeReindexOrchestrator', () => {
  const embed = async (text: string): Promise<number[]> => {
    const hash = crypto.createHash('sha1').update(text).digest('hex');
    const sum = text
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [text.length, sum % 997, parseInt(hash.slice(0, 8), 16) % 1000];
  };

  class InMemoryVectorStore implements VectorStoreAdapter {
    readonly name: string;
    private vectors = new Map<string, VectorDocument>();

    constructor(name: string) {
      this.name = name;
    }

    async removeByIds(ids: string[]): Promise<{ removed: string[] }> {
      const removed: string[] = [];
      for (const id of ids) {
        if (this.vectors.delete(id)) {
          removed.push(id);
        }
      }
      return { removed };
    }

    async fetchByIds(ids: string[]): Promise<VectorDocument[]> {
      return ids
        .map((id) => this.vectors.get(id))
        .filter((doc): doc is VectorDocument => Boolean(doc))
        .map((doc) => ({ ...doc, metadata: { ...doc.metadata } }));
    }

    async upsert(documents: VectorDocument[]): Promise<void> {
      for (const doc of documents) {
        this.vectors.set(doc.id, { ...doc, metadata: { ...doc.metadata } });
      }
    }

    async snapshot() {
      const ids = Array.from(this.vectors.keys()).sort();
      return {
        adapter: this.name,
        ids,
        revision: crypto.createHash('sha1').update(ids.join('|')).digest('hex'),
      };
    }
  }

  const setupAuditLog = async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kpro-test-'));
    const file = path.join(dir, 'audit.log');
    return { audit: new JsonlAuditLog(file), dir };
  };

  it('purges forgotten entities, rebuilds context, and replays deterministically', async () => {
    const chunkStore = new InMemoryChunkStore();
    const chunking = new SimpleTextChunkingStrategy(embed);

    const docA: DocumentRecord = {
      id: 'docA',
      text: 'Alpha intelligence dossier referencing obsolete threat actor.',
      version: 1,
    };
    const docB: DocumentRecord = {
      id: 'docB',
      text: 'Beta field notes citing docA for context integrity.',
      version: 1,
      relatedIds: ['docA'],
    };

    const chunksA = await chunking.chunk(docA);
    const chunksB = await chunking.chunk(docB);
    chunkStore.registerDocument(docA, chunksA);
    chunkStore.registerDocument(docB, chunksB);
    chunkStore.linkDocuments('docB', ['docA']);

    const { audit, dir } = await setupAuditLog();
    const cacheStore = new Map<string, any>();
    const cache = new InMemoryCacheInvalidator(cacheStore);
    const vectorStore = new InMemoryVectorStore('primary');

    await vectorStore.upsert(
      chunksA.map((chunk) => ({
        id: `docA:${chunk.id}`,
        values: chunk.embedding,
        metadata: { documentId: chunk.documentId, text: chunk.text },
      })),
    );
    await vectorStore.upsert(
      chunksB.map((chunk) => ({
        id: `docB:${chunk.id}`,
        values: chunk.embedding,
        metadata: { documentId: chunk.documentId, text: chunk.text },
      })),
    );

    cacheStore.set('docA', { cached: true });
    cacheStore.set('docB', { cached: true });

    const orchestrator = new KnowledgePurgeReindexOrchestrator({
      vectorStores: [vectorStore],
      chunkStore,
      chunkingStrategy: chunking,
      cacheInvalidators: [cache],
      auditLog: audit,
    });

    const forget: ForgetRequest = {
      runId: 'run-1',
      triggeredBy: 'compliance',
      issuedAt: new Date().toISOString(),
      forget: [{ id: 'docA', type: 'document', reason: 'RTBF request' }],
    };

    const summary = await orchestrator.purge(forget);
    const removedVectorIds = chunksA.map((chunk) => `docA:${chunk.id}`);

    expect(summary.purgedIds).toEqual(['docA']);
    expect(summary.proofs).toHaveLength(1);
    const proof = summary.proofs[0];
    expect(proof.absence.map((a) => a.id).sort()).toEqual(
      removedVectorIds.sort(),
    );
    expect(proof.absence.every((a) => a.present === false)).toBe(true);
    expect(proof.diff.removed.sort()).toEqual(removedVectorIds.sort());
    expect(proof.diff.added).toHaveLength(0);

    const fetched = await vectorStore.fetchByIds(removedVectorIds);
    expect(fetched).toHaveLength(0);
    expect(cacheStore.has('docA')).toBe(false);

    const finalSnapshot = await vectorStore.snapshot();
    const finalChunksB = await chunkStore.listChunks('docB');

    const replayVector = new InMemoryVectorStore('primary');
    const replayChunkStore = new InMemoryChunkStore();
    const replayContext: ReplayContext = {
      applyVectorDelete: async (adapter, ids) => {
        if (adapter !== replayVector.name) return;
        await replayVector.removeByIds(ids);
      },
      applyVectorUpsert: async (adapter, docs) => {
        if (adapter !== replayVector.name) return;
        await replayVector.upsert(docs);
      },
      applyChunkReplace: async (documentId, chunks, document) => {
        const doc = document ?? {
          id: documentId,
          text: chunks.map((chunk) => chunk.text).join(' '),
          version: chunks[0]?.version ?? 1,
        };
        replayChunkStore.registerDocument(doc, chunks);
      },
    };

    await orchestrator.replay('run-1', replayContext);

    const replaySnapshot = await replayVector.snapshot();
    expect(replaySnapshot).toEqual(finalSnapshot);

    const replayChunksB = await replayChunkStore.listChunks('docB');
    expect(replayChunksB).toEqual(finalChunksB);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
