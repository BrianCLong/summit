import { z } from 'zod';

export interface TenantQuotaConfig {
  storageBytes?: number;
  evidenceCount?: number;
  exportCount?: number;
  jobConcurrency?: number;
  apiRatePerMinute?: number;
  runConcurrency?: number;
  stepThroughputPerMinute?: number;
  receiptBacklog?: number;
}

export type TenantQuotaMap = Record<string, TenantQuotaConfig>;

const TenantQuotaSchema = z.record(
  z.object({
    storageBytes: z.number().optional(),
    evidenceCount: z.number().optional(),
    exportCount: z.number().optional(),
    jobConcurrency: z.number().optional(),
    apiRatePerMinute: z.number().optional(),
    runConcurrency: z.number().optional(),
    stepThroughputPerMinute: z.number().optional(),
    receiptBacklog: z.number().optional(),
  }),
);

const UNLIMITED_QUOTA: Required<TenantQuotaConfig> = {
  storageBytes: Infinity,
  evidenceCount: Infinity,
  exportCount: Infinity,
  jobConcurrency: Infinity,
  apiRatePerMinute: Infinity,
  runConcurrency: Infinity,
  stepThroughputPerMinute: Infinity,
  receiptBacklog: Infinity,
};

let cachedQuotas: TenantQuotaMap | null = null;

const parseTenantQuotas = (): TenantQuotaMap => {
  const raw = process.env.TENANT_QUOTAS;
  if (!raw || raw.trim().length === 0) {
    return {};
  }

  const parsed = TenantQuotaSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Invalid TENANT_QUOTAS configuration: ${parsed.error.message}`);
  }

  return parsed.data;
};

export const loadTenantQuotas = (force = false): TenantQuotaMap => {
  if (!cachedQuotas || force) {
    cachedQuotas = parseTenantQuotas();
  }
  return cachedQuotas;
};

export const resetTenantQuotaCache = (): void => {
  cachedQuotas = null;
};

export const getTenantQuota = (tenantId: string): Required<TenantQuotaConfig> => {
  const quotas = loadTenantQuotas();
  const configured = quotas[tenantId];
  if (!configured) {
    return UNLIMITED_QUOTA;
  }

  return {
    ...UNLIMITED_QUOTA,
    ...configured,
  };
};

export const isQuotaEnforcementEnabled = (): boolean => {
  const raw = process.env.TENANT_QUOTAS;
  return Boolean(raw && raw.trim().length > 0);
};

export const getAllTenantQuotas = (): TenantQuotaMap => loadTenantQuotas();
