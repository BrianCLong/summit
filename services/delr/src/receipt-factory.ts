import type {
  ActionRecord,
  EolReceipt,
  NormalizedPlan,
  PropagationSummary,
  ReconciliationReport
} from './types';

const FNV_OFFSET_BASIS = 1469598103934665603n;
const FNV_PRIME = 1099511628211n;
const FNV_MOD = (1n << 64n) - 1n;

export class ReceiptFactory {
  create(
    plan: NormalizedPlan,
    completedAt: string,
    propagation: PropagationSummary,
    verification: ReconciliationReport,
    actions: ActionRecord[]
  ): EolReceipt {
    const receipt: EolReceipt = {
      datasetId: plan.datasetId,
      planId: plan.planId,
      lastUse: plan.lastUse,
      successorDatasets: [...plan.successorDatasets],
      purgeScope: plan.purgeScope,
      completedAt,
      propagation,
      verification,
      checksum: ''
    };

    receipt.checksum = checksumForReceipt(receipt, actions);
    return receipt;
  }
}

export function checksumForReceipt(receipt: EolReceipt, actions: ActionRecord[]): string {
  const canonical = {
    datasetId: receipt.datasetId,
    planId: receipt.planId,
    lastUse: receipt.lastUse,
    successors: [...receipt.successorDatasets].sort(),
    purgeScope: sortScope(receipt.purgeScope),
    completedAt: receipt.completedAt,
    propagation: receipt.propagation,
    verification: {
      isClean: receipt.verification.isClean,
      residuals: [...receipt.verification.residuals].sort()
    },
    actions: actions
      .map((action) => ({
        planId: action.planId,
        datasetId: action.datasetId,
        domain: action.domain,
        target: action.target,
        status: action.status,
        completedAt: action.completedAt
      }))
      .sort((a, b) => {
        if (a.domain === b.domain) {
          return a.target.localeCompare(b.target);
        }
        return a.domain.localeCompare(b.domain);
      })
  };

  const serialized = stableSerialize(canonical);
  return fnv1a64(serialized);
}

function sortScope(scope: EolReceipt['purgeScope']): EolReceipt['purgeScope'] {
  return {
    caches: [...scope.caches].sort(),
    indexes: [...scope.indexes].sort(),
    features: [...scope.features].sort(),
    exports: [...scope.exports].sort()
  };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const serialized = value.map((entry) => stableSerialize(entry)).sort();
    return `[${serialized.join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const serializedEntries = entries.map(([key, val]) => `${JSON.stringify(key)}:${stableSerialize(val)}`);
  return `{${serializedEntries.join(',')}}`;
}

function fnv1a64(input: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash *= FNV_PRIME;
    hash &= FNV_MOD;
  }
  return hash.toString(16).padStart(16, '0');
}
