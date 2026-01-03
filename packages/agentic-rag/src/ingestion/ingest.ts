import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RecursiveChunker } from '../core/chunker.js';
import { DeterministicEmbedder } from '../core/embedder.js';
import { PgVectorStore } from '../core/vectorStore.js';
import type { GraphStore } from '../core/types.js';

export interface IngestionOptions {
  sourceDir: string;
  workspaceId: string;
  pool: any;
  graphStore?: GraphStore;
  rebuild?: boolean;
}

export async function ingestCorpus(options: IngestionOptions) {
  const chunker = new RecursiveChunker();
  const embedder = new DeterministicEmbedder();
  const vectorStore = new PgVectorStore({ pool: options.pool });
  const files = fs
    .readdirSync(options.sourceDir)
    .filter((file) => file.endsWith('.md') || file.endsWith('.txt'))
    .map((file) => path.join(options.sourceDir, file));

  const corpusVersion = crypto
    .createHash('sha256')
    .update(files.map((f) => fs.readFileSync(f, 'utf-8')).join('|'))
    .digest('hex');

  const chunks = files.flatMap((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    const docId = crypto.createHash('sha1').update(file).digest('hex');
    return chunker.chunk(docId, content, { source: file, corpusVersion });
  });

  for (const chunk of chunks) {
    chunk.embedding = await embedder.embed(chunk.content);
  }

  if (options.rebuild) {
    await options.pool.query('DELETE FROM rag_chunks WHERE workspace_id = $1', [options.workspaceId]);
  }

  await vectorStore.upsert(chunks, options.workspaceId, corpusVersion);
  if (options.graphStore) {
    await options.graphStore.upsertEntities(chunks, options.workspaceId);
  }

  return { chunksIngested: chunks.length, corpusVersion };
}

