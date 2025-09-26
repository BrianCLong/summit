import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger';

export interface VectorRecord {
  id: string;
  vector: number[];
  tenantId: string;
  nodeId?: string;
  embeddingModel?: string;
  metadata?: Record<string, unknown>;
}

export interface VectorSearchFilter {
  nodeIds?: string[];
  embeddingModel?: string;
}

export interface VectorSearchResult {
  id: string;
  nodeId?: string;
  tenantId?: string;
  score: number;
  embeddingModel?: string;
  metadata?: Record<string, unknown>;
}

interface PythonResponse<T> {
  status: 'ok' | 'error';
  error?: string;
  results?: T;
  count?: number;
  metrics?: Record<string, number>;
}

export class VectorSearchBridge {
  private readonly pythonModule = 'server.python.vector.runner';
  private readonly pythonBin = process.env.PYTHON_BIN || 'python3';
  private readonly pythonPath: string;
  private readonly cwd: string;
  private readonly config: Record<string, unknown>;
  private readonly enabled: boolean;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.cwd = path.resolve(__dirname, '..', '..');
    this.pythonPath = path.resolve(__dirname, '..', '..', 'python');

    const host = process.env.MILVUS_HOST || process.env.MILVUS_ADDRESS || undefined;
    const port = process.env.MILVUS_PORT ? Number(process.env.MILVUS_PORT) : undefined;
    const dim = process.env.EMBEDDING_DIMENSION ? Number(process.env.EMBEDDING_DIMENSION) : undefined;

    this.config = {
      collection_name: process.env.MILVUS_COLLECTION || 'summit_embeddings',
      dim,
      host,
      port,
      token: process.env.MILVUS_TOKEN,
      alias: process.env.MILVUS_ALIAS || 'default',
    };

    this.enabled = Boolean(host || process.env.VECTOR_DB_ENABLED === 'true');

    if (!this.enabled) {
      logger.debug('Vector search bridge disabled (no host configured)');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async upsertEmbeddings(records: VectorRecord[]): Promise<void> {
    if (!this.enabled || records.length === 0) {
      return;
    }

    const payloadRecords = records.map((record) => ({
      id: record.id,
      vector: record.vector,
      tenant_id: record.tenantId,
      node_id: record.nodeId || '',
      embedding_model: record.embeddingModel,
      metadata: record.metadata || {},
    }));

    const response = await this.runPython<PythonResponse<unknown>>({
      action: 'upsert',
      records: payloadRecords,
    });

    if (response.status !== 'ok') {
      throw new Error(response.error || 'Failed to upsert embeddings');
    }
  }

  async searchSimilar(
    vector: number[],
    tenantId: string,
    topK = 10,
    filter?: VectorSearchFilter,
  ): Promise<VectorSearchResult[]> {
    if (!this.enabled) {
      return [];
    }

    const response = await this.runPython<PythonResponse<any>>({
      action: 'search',
      vector,
      top_k: topK,
      tenant_id: tenantId,
      node_ids: filter?.nodeIds,
      embedding_model: filter?.embeddingModel,
    });

    if (response.status !== 'ok') {
      throw new Error(response.error || 'Vector similarity search failed');
    }

    const results = (response.results || []) as Array<Record<string, unknown>>;
    return results.map((result) => ({
      id: String(result.id ?? ''),
      nodeId: result.node_id ? String(result.node_id) : undefined,
      tenantId: result.tenant_id ? String(result.tenant_id) : undefined,
      score: typeof result.score === 'number' ? result.score : Number(result.score ?? 0),
      embeddingModel: result.embedding_model ? String(result.embedding_model) : undefined,
      metadata: (result.metadata as Record<string, unknown>) || undefined,
    }));
  }

  async benchmark(vector: number[], warmup = 3, runs = 10): Promise<Record<string, number>> {
    if (!this.enabled) {
      return {};
    }

    const response = await this.runPython<PythonResponse<Record<string, number>>>({
      action: 'benchmark',
      vector,
      warmup,
      runs,
    });

    if (response.status !== 'ok' || !response.metrics) {
      throw new Error(response.error || 'Benchmark failed');
    }

    return response.metrics;
  }

  private runPython<T>(payload: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonBin, ['-m', this.pythonModule], {
        cwd: this.cwd,
        env: {
          ...process.env,
          PYTHONPATH: this.buildPythonPath(),
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        logger.error('Failed to start python vector bridge', { error });
        reject(error);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          logger.error('Python vector bridge exited with error', { code, stderr });
          return reject(new Error(stderr || `Python process exited with code ${code}`));
        }

        try {
          const parsed = JSON.parse(stdout || '{}');
          resolve(parsed as T);
        } catch (error) {
          logger.error('Failed to parse python vector bridge output', { stdout, error });
          reject(error);
        }
      });

      child.stdin.write(JSON.stringify({ ...payload, config: this.config }));
      child.stdin.end();
    });
  }

  private buildPythonPath(): string {
    const existing = process.env.PYTHONPATH ? `${path.delimiter}${process.env.PYTHONPATH}` : '';
    return `${this.pythonPath}${existing}`;
  }
}

export const vectorSearchBridge = new VectorSearchBridge();
