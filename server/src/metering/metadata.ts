export const REQUIRED_METERING_METADATA_KEYS = [
  'tenant_id',
  'env',
  'actor_type',
  'workflow_type',
] as const;

export type MeteringMetadata = Record<string, unknown> & {
  tenant_id: string;
  env: string;
  actor_type: string;
  workflow_type: string;
};

export const resolveMeteringEnv = (): string =>
  process.env.APP_ENV || process.env.NODE_ENV || 'unknown';

export function buildMeteringMetadata(input: {
  tenantId: string;
  actorType: string;
  workflowType: string;
  extra?: Record<string, unknown>;
}): MeteringMetadata {
  return {
    tenant_id: input.tenantId,
    env: resolveMeteringEnv(),
    actor_type: input.actorType,
    workflow_type: input.workflowType,
    ...(input.extra || {}),
  };
}

export function ensureMeteringMetadata(input: {
  tenantId: string;
  actorType?: string;
  workflowType?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}): MeteringMetadata {
  const actorType = input.actorType || (input.metadata?.actor_type as string) || 'system';
  const workflowType =
    input.workflowType ||
    (input.metadata?.workflow_type as string) ||
    input.source ||
    'unknown';

  return buildMeteringMetadata({
    tenantId: input.tenantId,
    actorType,
    workflowType,
    extra: input.metadata,
  });
}

export function hasRequiredMeteringMetadata(
  metadata?: Record<string, unknown>,
): boolean {
  if (!metadata) return false;
  return REQUIRED_METERING_METADATA_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(metadata, key),
  );
}
