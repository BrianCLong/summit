import type { NextFunction, Request, Response } from 'express';
import { HybridEntityRecognizer } from '../pii/recognizer.js';
import { redactionService } from '../redaction/redact.js';
import { logger as appLogger } from '../config/logger.js';

type PiiFinding = {
  path: string;
  type: string;
  confidence: number;
  detector: string;
};

type PiiGuardOptions = {
  logger?: typeof appLogger;
  maximumPreviewBytes?: number;
  minimumConfidence?: number;
};

const recognizer = new HybridEntityRecognizer();

const buildTenantId = (req: Request): string => {
  const candidate =
    (req as any).tenant?.id ||
    (req as any).tenant_id ||
    (req as any).user?.tenant_id ||
    req.headers['x-tenant-id'] ||
    'public';
  return typeof candidate === 'string' ? candidate : String(candidate);
};

const flattenStrings = (
  value: unknown,
  path: string[] = [],
  results: Array<{ path: string; value: string }> = [],
): Array<{ path: string; value: string }> => {
  if (value === null || value === undefined) return results;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    results.push({ path: path.join('.'), value: String(value) });
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, idx) => {
      flattenStrings(entry, [...path, String(idx)], results);
    });
    return results;
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      flattenStrings(nested, [...path, key], results);
    });
  }

  return results;
};

const summarizePayload = (payload: unknown, maximumPreviewBytes: number): string | undefined => {
  if (payload === undefined) return undefined;

  const serialized = JSON.stringify(payload);
  if (!serialized) return undefined;
  if (serialized.length <= maximumPreviewBytes) return serialized;
  return `${serialized.slice(0, maximumPreviewBytes)}…[truncated]`;
};

const redactPayloadForLogging = async (
  payload: unknown,
  tenantId: string,
): Promise<any | undefined> => {
  if (!payload || typeof payload !== 'object') return undefined;
  try {
    const policy = redactionService.createRedactionPolicy(['pii', 'financial', 'sensitive']);
    return await redactionService.redactObject(payload, policy, tenantId, { source: 'pii-guard' });
  } catch (error: any) {
    appLogger.warn({ err: error }, 'PII guard redaction failed; continuing without payload preview');
    return undefined;
  }
};

const detectPii = async (
  payload: unknown,
  minimumConfidence: number,
): Promise<PiiFinding[]> => {
  const targets = flattenStrings(payload, ['body']);
  const findings: PiiFinding[] = [];

  for (const target of targets) {
    if (!target.value) continue;
    const result = await recognizer.recognize({
      value: target.value,
      recordId: target.path,
    });

    result.entities
      .filter((entity) => entity.confidence >= minimumConfidence)
      .forEach((entity) => {
        findings.push({
          path: target.path,
          type: entity.type,
          confidence: entity.confidence,
          detector: entity.detectors?.[0] ?? 'pattern',
        });
      });
  }

  return findings;
};

export const createPiiGuardMiddleware = (options: PiiGuardOptions = {}) => {
  const logger = options.logger ?? appLogger.child({ module: 'pii-guard' });
  const maximumPreviewBytes = options.maximumPreviewBytes ?? 512;
  const minimumConfidence = options.minimumConfidence ?? 0.6;

  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = buildTenantId(req);
    const piiFindings = await detectPii(req.body, minimumConfidence);
    const redactedRequest = await redactPayloadForLogging(req.body, tenantId);

    const captureResponseRedaction = async (payload: unknown) => {
      const redactedResponse = await redactPayloadForLogging(payload, tenantId);
      if (redactedResponse !== undefined) {
        (res.locals as any).piiGuardRedactedResponse = redactedResponse;
      }
    };

    const originalJson = res.json.bind(res);
    res.json = ((body?: any) => {
      void captureResponseRedaction(body);
      return originalJson(body);
    }) as typeof res.json;

    const originalSend = res.send.bind(res);
    res.send = ((body?: any) => {
      void captureResponseRedaction(body);
      return originalSend(body);
    }) as typeof res.send;

    res.on('finish', () => {
      const redactedResponse = (res.locals as any).piiGuardRedactedResponse;
      const summary = {
        requestFindings: piiFindings.map((finding) => ({
          path: finding.path,
          type: finding.type,
          confidence: Number(finding.confidence.toFixed(2)),
          detector: finding.detector,
        })),
        redactedRequestPreview: summarizePayload(redactedRequest, maximumPreviewBytes),
        redactedResponsePreview: summarizePayload(redactedResponse, maximumPreviewBytes),
        tenantId,
      };

      logger.info({ piiScan: summary }, 'PII guard redaction applied to HTTP exchange');
    });

    return next();
  };
};

export const piiGuardMiddleware = createPiiGuardMiddleware();

export default piiGuardMiddleware;
