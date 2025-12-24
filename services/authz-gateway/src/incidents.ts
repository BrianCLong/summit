import crypto from 'node:crypto';
import type { Request } from 'express';
import { buildSloEvidence, resolveTenantId } from './slo';
import { registry } from './observability';

export interface IncidentEvidence {
  id: string;
  generatedAt: string;
  tenantId: string;
  route: string | 'fleet';
  traceId: string;
  spanId?: string;
  requestHeaders: Record<string, string>;
  metrics: ReturnType<typeof buildSloEvidence>['metrics'];
  controls: {
    policyBundleVersion: string;
    residency?: string;
    classification?: string;
  };
  context: {
    action?: string;
    resourceId?: string;
  };
  metricsSnapshot: string;
}

function buildRequestHeaders(req: Request): Record<string, string> {
  return Object.entries(req.headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      acc[key] = value.join(',');
    }
    return acc;
  }, {});
}

export async function generateIncidentEvidence(req: Request) {
  const traceId = (req.headers['x-trace-id'] as string | undefined) || crypto.randomUUID();
  const spanId = req.headers['x-span-id'] as string | undefined;
  const tenantId = resolveTenantId(req as any, (req as any).res || ({} as any));
  const route = req.route?.path || req.path || 'fleet';
  const sloEvidence = buildSloEvidence(tenantId, route);

  return {
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    tenantId,
    route,
    traceId,
    spanId,
    requestHeaders: buildRequestHeaders(req),
    metrics: sloEvidence.metrics,
    controls: {
      policyBundleVersion: process.env.POLICY_BUNDLE_VERSION || 'v1',
      residency: (req.headers['x-resource-residency'] as string | undefined) || 'unknown',
      classification:
        (req.headers['x-resource-classification'] as string | undefined) || 'unknown',
    },
    context: {
      action: (req as any).res?.locals?.action,
      resourceId: (req as any).res?.locals?.resourceId,
    },
    metricsSnapshot: await registry.metrics(),
  } as IncidentEvidence;
}
