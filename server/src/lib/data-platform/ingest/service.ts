import { PipelineStage, PipelineContext, IngestionPipeline } from './pipeline.js';
import EmbeddingService from '../../../services/EmbeddingService.js';
import { pg, pool } from '../../../db/pg.js';
import crypto from 'crypto';

// --- STAGES ---

export class ParseStage implements PipelineStage {
  name = 'parse' as const;

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.rawContent) {
      if (!context.text) throw new Error("No content to parse");
      return context;
    }

    // Fallback: assume UTF-8 text
    context.text = context.rawContent.toString('utf-8');
    return context;
  }
}

export class NormalizeStage implements PipelineStage {
  name = 'normalize' as const;

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.text) return context;
    context.text = context.text.replace(/\s+/g, ' ').trim();
    return context;
  }
}

export class ChunkStage implements PipelineStage {
  name = 'chunk' as const;

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.text) return context;

    // Simple chunking strategy: fixed size with overlap
    const chunkSize = 1000;
    const overlap = 100;

    const chunks = [];
    const text = context.text;
    let position = 0;

    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
      const chunkText = text.slice(i, i + chunkSize);
      chunks.push({
        text: chunkText,
        position: position++,
        metadata: {}
      });

      if (i + chunkSize >= text.length) break;
    }

    context.chunks = chunks;
    return context;
  }
}

export class EmbedStage implements PipelineStage {
  name = 'embed' as const;
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.chunks || context.chunks.length === 0) return context;

    const texts = context.chunks.map(c => c.text);
    const embeddings = await this.embeddingService.generateEmbeddings(texts);

    context.chunks.forEach((chunk, i) => {
      chunk.embedding = embeddings[i];
    });

    return context;
  }
}

export class StoreStage implements PipelineStage {
  name = 'store' as const;

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (!context.chunks) return context;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update document status
      await client.query(
        `UPDATE documents SET processing_status = 'completed', updated_at = NOW() WHERE id = $1`,
        [context.documentId]
      );

      // Delete existing chunks
      await client.query(`DELETE FROM doc_chunks WHERE document_id = $1`, [context.documentId]);

      const insertQuery = `
        INSERT INTO doc_chunks (
          document_id, tenant_id, collection_id, position, text, embedding, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      for (const chunk of context.chunks) {
        // PGVector formatting
        const embeddingStr = JSON.stringify(chunk.embedding);

        await client.query(insertQuery, [
          context.documentId,
          context.tenantId,
          context.collectionId,
          chunk.position,
          chunk.text,
          embeddingStr,
          chunk.metadata
        ]);
      }

      await client.query('COMMIT');
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return context;
  }
}

// --- WORKER / JOB PROCESSOR (Maestro Placeholder) ---

export class IngestionWorker {
  async processJob(jobId: string, payload: any) {
    const { tenantId, collectionId, documentId, contentBase64, mimeType } = payload;
    const content = Buffer.from(contentBase64, 'base64');

    console.log(`[MaestroWorker] Processing ingestion job ${jobId} for doc ${documentId}`);

    // 1. Mark document as processing
    await pg.write(
      `UPDATE documents SET processing_status = 'processing' WHERE id = $1`,
      [documentId],
      { tenantId }
    );

    try {
      // 2. Build Pipeline
      const pipeline = new IngestionPipeline([
        new ParseStage(),
        new NormalizeStage(),
        new ChunkStage(),
        new EmbedStage(),
        new StoreStage()
      ]);

      // 3. Run
      const context: PipelineContext = {
        tenantId,
        collectionId,
        documentId,
        rawContent: content,
        metadata: { mimeType },
        startTime: Date.now(),
        config: {}
      };

      await pipeline.run(context);
      console.log(`[MaestroWorker] Job ${jobId} completed successfully`);

    } catch (err: any) {
      console.error(`[MaestroWorker] Job ${jobId} failed`, err);
      // Mark as failed
      await pg.write(
        `UPDATE documents SET processing_status = 'failed', processing_error = $2 WHERE id = $1`,
        [documentId, err.message],
        { tenantId }
      );
      throw err;
    }
  }
}

// --- SERVICE ---

export class IngestionService {
  private worker: IngestionWorker;

  constructor() {
    this.worker = new IngestionWorker();
  }

  // Orchestration method: Enqueue job
  async enqueueIngestionJob(
    tenantId: string,
    collectionId: string,
    documentId: string,
    content: Buffer,
    mimeType: string
  ) {
    // In a real system, this would push to BullMQ / Maestro
    // await maestro.createTask('ingest_document', { ... });

    // For MVP/Simulator, we fire-and-forget (or use a simple in-memory async)
    // We serialize content to base64 to simulate a job payload
    const payload = {
        tenantId,
        collectionId,
        documentId,
        contentBase64: content.toString('base64'),
        mimeType
    };
    const jobId = `job_${Date.now()}_${documentId}`;

    // Simulate Async Execution
    setImmediate(() => {
        this.worker.processJob(jobId, payload).catch(e => console.error("Async Job Error", e));
    });

    return jobId;
  }

  async createDocument(tenantId: string, collectionId: string, title: string, sourceUri: string, mimeType: string, content: Buffer) {
      // Create DB record
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const sizeBytes = content.length;

      const result = await pg.oneOrNone(
        `INSERT INTO documents (
           tenant_id, collection_id, title, source_uri, mime_type, size_bytes, hash, processing_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING id`,
        [tenantId, collectionId, title, sourceUri, mimeType, sizeBytes, hash, 'pending'],
        { tenantId, forceWrite: true }
      );

      if (!result) throw new Error("Failed to create document record");

      const docId = result.id;

      // Enqueue Job
      await this.enqueueIngestionJob(tenantId, collectionId, docId, content, mimeType);

      return docId;
  }
}
