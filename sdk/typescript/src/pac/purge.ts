import { Manifest } from './manifest';
import { CacheKeyParts, parseCacheKey } from './key';

export interface PurgeCriteria {
  policyHashes?: string[];
  subjectClasses?: string[];
  jurisdictions?: string[];
  keys?: string[];
}

export interface PurgeReport {
  dryRun: boolean;
  count: number;
  keys: CacheKeyParts[];
  manifests: Manifest[];
}

const hasValue = (collection?: string[]): collection is string[] => {
  return Array.isArray(collection) && collection.length > 0;
};

const includes = (collection: string[], value: string): boolean => {
  return collection.includes(value);
};

const matchesCriteria = (manifest: Manifest, criteria: PurgeCriteria): boolean => {
  if (hasValue(criteria.keys)) {
    if (!includes(criteria.keys, manifest.key)) {
      return false;
    }
  }
  if (hasValue(criteria.policyHashes) && !includes(criteria.policyHashes, manifest.policyHash)) {
    return false;
  }
  if (hasValue(criteria.subjectClasses) && !includes(criteria.subjectClasses, manifest.subjectClass)) {
    return false;
  }
  if (hasValue(criteria.jurisdictions) && !includes(criteria.jurisdictions, manifest.jurisdiction)) {
    return false;
  }
  return true;
};

export const selectManifestsForPurge = (manifests: Manifest[], criteria: PurgeCriteria): Manifest[] => {
  if (!hasValue(criteria.policyHashes) && !hasValue(criteria.subjectClasses) && !hasValue(criteria.jurisdictions) && !hasValue(criteria.keys)) {
    return [];
  }
  return manifests.filter((manifest) => matchesCriteria(manifest, criteria));
};

export const createPurgeReport = (manifests: Manifest[], criteria: PurgeCriteria, dryRun: boolean): PurgeReport => {
  const selected = selectManifestsForPurge(manifests, criteria);
  const keys = selected.map((manifest) => parseCacheKey(manifest.key));
  return {
    dryRun,
    count: selected.length,
    keys,
    manifests: selected,
  };
};

export const reportsAreEquivalent = (a: PurgeReport, b: PurgeReport): boolean => {
  if (a.count !== b.count) {
    return false;
  }
  for (let i = 0; i < a.keys.length; i += 1) {
    const keyA = a.keys[i];
    const keyB = b.keys[i];
    if (!keyB) {
      return false;
    }
    if (
      keyA.resourceId !== keyB.resourceId ||
      keyA.tenant !== keyB.tenant ||
      keyA.subjectClass !== keyB.subjectClass ||
      keyA.policyHash !== keyB.policyHash ||
      keyA.locale !== keyB.locale
    ) {
      return false;
    }
  }
  return true;
};

