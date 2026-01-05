export type CostBucketKey =
  | 'computeProxy'
  | 'storageGbMonth'
  | 'receiptSigningOps';

export interface CostBucketDefinition {
  key: CostBucketKey;
  description: string;
  unit: string;
  rateUsd: number;
}

export interface UsageAggregates {
  computeMs: number;
  storageBytesAverage: number;
  receiptSigningOps: number;
  periodDays: number;
}

export interface CostBucketResult {
  key: CostBucketKey;
  unit: string;
  quantity: number;
  rateUsd: number;
  costUsd: number;
}

export interface CostCalculationResult {
  buckets: Record<CostBucketKey, CostBucketResult>;
  totalUsd: number;
}

const BYTES_PER_GB = 1024 ** 3;
const DAYS_PER_MONTH = 30;

export const DEFAULT_COST_BUCKETS: Record<CostBucketKey, CostBucketDefinition> = {
  computeProxy: {
    key: 'computeProxy',
    description: 'Compute proxy units derived from aggregate compute duration.',
    unit: 'compute-second',
    rateUsd: 0.00002,
  },
  storageGbMonth: {
    key: 'storageGbMonth',
    description: 'Average storage footprint expressed in GB-months.',
    unit: 'gb-month',
    rateUsd: 0.12,
  },
  receiptSigningOps: {
    key: 'receiptSigningOps',
    description: 'Receipt signing operations per billing period.',
    unit: 'sign-op',
    rateUsd: 0.0004,
  },
};

export function calculateCostFromUsage(
  usage: UsageAggregates,
  buckets: Record<CostBucketKey, CostBucketDefinition> = DEFAULT_COST_BUCKETS,
): CostCalculationResult {
  const computeSeconds = usage.computeMs / 1000;
  const storageGbMonths =
    (usage.storageBytesAverage / BYTES_PER_GB) *
    (usage.periodDays / DAYS_PER_MONTH);

  const computeBucket: CostBucketResult = {
    key: buckets.computeProxy.key,
    unit: buckets.computeProxy.unit,
    quantity: computeSeconds,
    rateUsd: buckets.computeProxy.rateUsd,
    costUsd: computeSeconds * buckets.computeProxy.rateUsd,
  };

  const storageBucket: CostBucketResult = {
    key: buckets.storageGbMonth.key,
    unit: buckets.storageGbMonth.unit,
    quantity: storageGbMonths,
    rateUsd: buckets.storageGbMonth.rateUsd,
    costUsd: storageGbMonths * buckets.storageGbMonth.rateUsd,
  };

  const receiptBucket: CostBucketResult = {
    key: buckets.receiptSigningOps.key,
    unit: buckets.receiptSigningOps.unit,
    quantity: usage.receiptSigningOps,
    rateUsd: buckets.receiptSigningOps.rateUsd,
    costUsd: usage.receiptSigningOps * buckets.receiptSigningOps.rateUsd,
  };

  const totalUsd =
    computeBucket.costUsd + storageBucket.costUsd + receiptBucket.costUsd;

  return {
    buckets: {
      computeProxy: computeBucket,
      storageGbMonth: storageBucket,
      receiptSigningOps: receiptBucket,
    },
    totalUsd,
  };
}
