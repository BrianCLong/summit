import crypto from 'crypto';

interface TransformerOptions {
  modelName?: string;
  maxBatchSize?: number;
  cacheTtlMs?: number;
}

interface AnnotationRequest {
  context: string;
  coref: Record<string, string[]>;
  language?: string;
}

interface CachedEntry<T> {
  value: T;
  expiresAt: number;
}

export class TransformerInferenceService {
  private modelName: string;
  private maxBatchSize: number;
  private cacheTtlMs: number;
  private cache: Map<string, CachedEntry<Record<string, unknown>>>;
  private queue: AnnotationRequest[] = [];
  private queueResolvers: Array<(value: Record<string, unknown>) => void> = [];

  constructor(options: TransformerOptions = {}) {
    this.modelName = options.modelName || 'domain-transformer-small';
    this.maxBatchSize = options.maxBatchSize || 16;
    this.cacheTtlMs = options.cacheTtlMs || 5 * 60 * 1000;
    this.cache = new Map();
    setInterval(() => this.flushQueue(), 50).unref();
  }

  get selectedModel(): string {
    return this.modelName;
  }

  toContextString(payload: Record<string, unknown>): string {
    return Object.entries(payload)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join('\n');
  }

  async annotate(request: AnnotationRequest): Promise<Record<string, unknown>> {
    const cacheKey = this.buildCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const resultPromise = new Promise<Record<string, unknown>>((resolve) => {
      this.queue.push(request);
      this.queueResolvers.push(resolve);
    });

    const result = await resultPromise;
    this.cache.set(cacheKey, { value: result, expiresAt: Date.now() + this.cacheTtlMs });
    return result;
  }

  private async flushQueue() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.maxBatchSize);
    const resolvers = this.queueResolvers.splice(0, this.maxBatchSize);

    try {
      // Process requests sequentially or in parallel depending on Python script capability
      // Here we process sequentially for simplicity as the script is single-shot
      const results = await Promise.all(batch.map((item) => this.runPythonInference(item)));
      results.forEach((result, idx) => resolvers[idx](result));
    } catch (error: any) {
       // Fallback or error handling
       console.error("NER Inference failed", error);
       resolvers.forEach(resolve => resolve({ error: "Inference failed" }));
    }
  }

  private async runPythonInference(request: AnnotationRequest): Promise<Record<string, unknown>> {
    const { PythonShell } = await import('python-shell');
    const options = {
      mode: 'json' as const,
      pythonPath: 'python', // Assumes python is in PATH and has spacy installed
      scriptPath: 'src/nlp/scripts',
      args: [JSON.stringify({ text: request.context, language: request.language || 'en' })]
    };

    return new Promise((resolve, reject) => {
      PythonShell.run('ner.py', options).then((messages: unknown[]) => {
         if (messages && messages.length > 0) {
           const output = messages[0] as Record<string, unknown>;
           resolve({
             model: this.modelName,
             tokenCount: request.context.split(/\s+/).length,
             coreferenceChains: request.coref,
             ...output
           });
         } else {
           resolve({ error: "No output from NER script" });
         }
      }).catch((err: unknown) => {
        reject(err);
      });
    });
  }

  private buildCacheKey(request: AnnotationRequest): string {
    return crypto
      .createHash('sha1')
      .update(`${this.modelName}:${request.context}:${JSON.stringify(request.coref)}`)
      .digest('hex');
  }
}
