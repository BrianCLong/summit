import crypto from 'crypto';

interface TransformerOptions {
  modelName?: string;
  maxBatchSize?: number;
  cacheTtlMs?: number;
}

interface AnnotationRequest {
  context: string;
  coref: Record<string, string[]>;
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

  private flushQueue() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.maxBatchSize);
    const resolvers = this.queueResolvers.splice(0, this.maxBatchSize);

    const annotations = batch.map((item) => this.fakeForwardPass(item));
    annotations.forEach((annotation, idx) => resolvers[idx](annotation));
  }

  private fakeForwardPass(request: AnnotationRequest): Record<string, unknown> {
    const tokenCount = request.context.split(/\s+/).length;
    const entities = this.extractEntities(request.context);
    return {
      model: this.modelName,
      tokenCount,
      coreferenceChains: request.coref,
      entities,
    };
  }

  private extractEntities(text: string) {
    const sentences = text.split(/[.!?]/).filter(Boolean);
    return sentences.map((sentence) => ({
      text: sentence.trim(),
      label: 'SENTENCE',
      confidence: Math.min(0.99, sentence.length / 120),
    }));
  }

  private buildCacheKey(request: AnnotationRequest): string {
    return crypto
      .createHash('sha1')
      .update(`${this.modelName}:${request.context}:${JSON.stringify(request.coref)}`)
      .digest('hex');
  }
}
