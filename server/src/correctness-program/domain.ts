import {
  CanonicalIdentityPolicy,
  DomainName,
  TruthCheckResult,
  TruthDebt,
  TruthDebtKind,
  TruthMapEntry,
  TruthSource,
  newIdentifier,
} from './types.js';

export class TruthMapRegistry {
  private truthMap = new Map<DomainName, TruthMapEntry>();
  private identityPolicies = new Map<DomainName, CanonicalIdentityPolicy>();
  private truthDebt: TruthDebt[] = [];

  declareDomain(entry: TruthMapEntry, identityPolicy: CanonicalIdentityPolicy) {
    this.truthMap.set(entry.domain, entry);
    this.identityPolicies.set(entry.domain, identityPolicy);
  }

  listTruthMap(): TruthMapEntry[] {
    return Array.from(this.truthMap.values());
  }

  getDomain(domain: DomainName): TruthMapEntry | undefined {
    return this.truthMap.get(domain);
  }

  getIdentityPolicy(domain: DomainName): CanonicalIdentityPolicy | undefined {
    return this.identityPolicies.get(domain);
  }

  addTruthDebt(domain: DomainName, kind: TruthDebtKind, description: string, mitigation?: string, owner?: string) {
    const debt: TruthDebt = {
      id: newIdentifier(),
      domain,
      kind,
      description,
      detectedAt: new Date(),
      mitigation,
      owner,
    };
    this.truthDebt.push(debt);
    return debt;
  }

  listTruthDebt(): TruthDebt[] {
    return [...this.truthDebt];
  }

  truthDebtCount(): number {
    return this.truthDebt.length;
  }

  truthCheck(domain: DomainName, entityId: string, sources: Record<string, any>[]): TruthCheckResult {
    const entry = this.truthMap.get(domain);
    if (!entry) {
      return { domain, entityId, status: 'unknown', notes: 'Domain is not registered in the truth map' };
    }

    if (sources.length === 0) {
      return { domain, entityId, status: 'unknown', notes: 'No sources provided for truth check' };
    }

    const serialized = sources.map((s) => JSON.stringify(s)).sort();
    const unique = new Set(serialized);
    if (unique.size === 1) {
      return { domain, entityId, status: 'healthy', notes: `${entry.systemOfRecord.name} authoritative` };
    }

    const diffs = serialized.filter((value, index, arr) => arr.indexOf(value) !== index);
    return {
      domain,
      entityId,
      status: 'drift',
      notes: 'Detected differing representations across sources',
      detectedDrift: diffs,
    };
  }

  ensureCanonicalId(domain: DomainName, record: Record<string, any>) {
    const policy = this.identityPolicies.get(domain);
    if (!policy) {
      throw new Error(`No identity policy for domain ${domain}`);
    }
    const canonicalId = record[policy.canonicalIdField];
    if (!canonicalId) {
      throw new Error(`Record missing canonical ID field ${policy.canonicalIdField}`);
    }
    return canonicalId;
  }
}

export const defaultTruthSources: Record<DomainName, TruthSource> = {
  customer: { name: 'customers-db', kind: 'database', uri: 'postgresql://customer' },
  billing: { name: 'billing-ledger', kind: 'database', uri: 'postgresql://billing' },
  usage: { name: 'usage-meter', kind: 'service', uri: 'https://usage/api' },
  content: { name: 'content-repo', kind: 'service', uri: 'https://content/api' },
  permissions: { name: 'authz-engine', kind: 'service', uri: 'https://authz/api' },
  generic: { name: 'generic-truth', kind: 'service', uri: 'https://truth/api' },
};
