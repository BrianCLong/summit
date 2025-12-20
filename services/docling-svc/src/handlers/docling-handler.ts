import { Request, Response } from 'express';
import { z } from 'zod';
import { GraniteDoclingClient } from '../granite-client.js';
import { loadConfig } from '../config.js';
import {
  ParseRequestBody,
  SummarizeRequestBody,
  ExtractRequestBody,
  DoclingResponse,
} from '../types.js';
import {
  doclingLatency,
  doclingChars,
  doclingCost,
  doclingSuccess,
  doclingCacheGauge,
  doclingQuality,
  register,
} from '../metrics/metrics.js';
import {
  evaluatePurposePolicy,
  evaluateLicensePolicy,
} from '../security/policy.js';
import { provenanceEmitter } from '../provenance/ledger.js';
import { safeLogPayload } from '../utils/redaction.js';

const config = loadConfig();

const parseSchema = z.object({
  requestId: z.string().min(8),
  tenantId: z.string().min(1),
  purpose: z.enum([
    'investigation',
    't&s',
    'benchmarking',
    'release_notes',
    'compliance',
  ]),
  retention: z.enum(['short', 'standard']),
  contentType: z.string().min(1),
  hints: z.array(z.string()).optional(),
  uri: z.string().url().optional(),
  bytes: z.string().optional(),
  policyTags: z.array(z.string()).optional(),
});

const summarizeSchema = z.object({
  requestId: z.string().min(8),
  tenantId: z.string().min(1),
  purpose: z.enum([
    'investigation',
    't&s',
    'benchmarking',
    'release_notes',
    'compliance',
  ]),
  retention: z.enum(['short', 'standard']),
  text: z.string().min(1),
  focus: z.enum(['failures', 'changelog', 'compliance']),
  maxTokens: z.number().int().positive().optional(),
  relatedFragmentIds: z.array(z.string()).optional(),
  policyTags: z.array(z.string()).optional(),
});

const extractSchema = z.object({
  requestId: z.string().min(8),
  tenantId: z.string().min(1),
  purpose: z.enum([
    'investigation',
    't&s',
    'benchmarking',
    'release_notes',
    'compliance',
  ]),
  retention: z.enum(['short', 'standard']),
  text: z.string().optional(),
  bytes: z.string().optional(),
  targets: z
    .array(z.enum(['license', 'version', 'cve', 'owner', 'policy']))
    .min(1),
  fragmentIds: z.array(z.string()).optional(),
  policyTags: z.array(z.string()).optional(),
});

type CacheEntry<T> = { expiresAt: number; response: DoclingResponse<T> };

export class DoclingHandler {
  private client: GraniteDoclingClient;
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(client: GraniteDoclingClient = new GraniteDoclingClient()) {
    this.client = client;
  }

  parse = async (req: Request, res: Response) => {
    await this.dispatch(req, res, 'parse', parseSchema, async (payload) =>
      this.client.parse(payload),
    );
  };

  summarize = async (req: Request, res: Response) => {
    await this.dispatch(
      req,
      res,
      'summarize',
      summarizeSchema,
      async (payload) => this.client.summarize(payload),
    );
  };

  extract = async (req: Request, res: Response) => {
    await this.dispatch(req, res, 'extract', extractSchema, async (payload) =>
      this.client.extract(payload),
    );
  };

  metrics = async (_req: Request, res: Response) => {
    res.setHeader('content-type', register.contentType);
    res.send(await register.metrics());
  };

  cacheSize(): number {
    return this.cache.size;
  }

  private async dispatch<
    Schema extends z.ZodTypeAny,
    Result,
  >(
    req: Request,
    res: Response,
    operation: 'parse' | 'summarize' | 'extract',
    schema: Schema,
          executor: (payload: any) => Promise<DoclingResponse<Result>>,  ) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      doclingSuccess.labels(operation, 'validation_error').inc();
      return res
        .status(400)
        .json({ error: 'invalid_request', details: parsed.error.issues });
    }

    const payload = parsed.data as any;

    const policyDecision = evaluatePurposePolicy(payload);
    if (!policyDecision.allow) {
      doclingSuccess.labels(operation, 'policy_denied').inc();
      return res
        .status(403)
        .json({ error: 'policy_denied', reason: policyDecision.reason });
    }

    const cached = this.getFromCache<Result>(payload.requestId);
    if (cached) {
      doclingSuccess.labels(operation, 'cache_hit').inc();
      return res.json(cached);
    }

    const timer = doclingLatency.startTimer({
      operation,
      tenant_id: (payload as any).tenantId,
      purpose: (payload as any).purpose,
    });

    try {
      const response = await executor(payload);
      timer();

      doclingSuccess.labels(operation, 'success').inc();
      doclingChars
        .labels(operation, (payload as any).tenantId)
        .inc(response.usage.characters);
      doclingCost
        .labels((payload as any).tenantId, (payload as any).purpose)
        .inc(response.usage.costUsd);

      response.policySignals.forEach((signal) => {
        const decision = evaluateLicensePolicy(signal);
        if (!decision.allow) {
          doclingSuccess.labels(operation, 'policy_signal_blocked').inc();
        }
        if (signal.qualitySignals) {
          Object.entries(signal.qualitySignals).forEach(([key, value]) =>
            doclingQuality.labels(key).observe(Number(value)),
          );
        }
      });

      this.putInCache(payload.requestId, response);
      provenanceEmitter.record({
        tenantId: response.tenantId,
        purpose: response.purpose,
        retention: response.retention,
        policyTags: (payload as any).policyTags ?? [],
        modelId: response.provenance.modelId,
        modelCheckpoint: response.provenance.modelCheckpoint,
        parameters: response.provenance.parameters,
        input: payload,
        output: response.result,
        requestId: response.requestId,
      });

      const sanitized = safeLogPayload({
        requestId: response.requestId,
        tenantId: response.tenantId,
        purpose: response.purpose,
        retention: response.retention,
      });
      if (sanitized.wasRedacted) {
        doclingSuccess.labels(operation, 'redacted').inc();
      }

      return res.json(response);
    } catch (error: any) {
      timer();
      doclingSuccess.labels(operation, 'error').inc();
      const fallback = await this.fallback(operation, payload);
      return res.status(502).json({
        error: 'upstream_error',
        message: error?.message || 'Docling upstream failure',
        fallback,
      });
    }
  }

  private getFromCache<T>(requestId: string): DoclingResponse<T> | undefined {
    const entry = this.cache.get(requestId);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(requestId);
      doclingCacheGauge.set(this.cache.size);
      return undefined;
    }
    return entry.response as DoclingResponse<T>;
  }

  private putInCache<T>(requestId: string, response: DoclingResponse<T>) {
    if (this.cache.size >= config.maxCacheEntries) {
      const [firstKey] = this.cache.keys();
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(requestId, {
      expiresAt: Date.now() + config.cacheTtlSeconds * 1000,
      response,
    });
    doclingCacheGauge.set(this.cache.size);
  }

  private async fallback(operation: string, payload: any) {
    try {
      if (operation === 'parse') {
        return this.client.parse(payload as ParseRequestBody);
      }
      if (operation === 'summarize') {
        return this.client.summarize(payload as SummarizeRequestBody);
      }
      if (operation === 'extract') {
        return this.client.extract(payload as ExtractRequestBody);
      }
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
}
