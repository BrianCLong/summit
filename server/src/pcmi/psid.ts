import { createHash } from 'crypto';
import { AttributeBucket, PolicyScope, SubjectBucket } from './types.js';

const serializeAttributes = (attributes: AttributeBucket): string => {
  return Object.keys(attributes)
    .sort()
    .map((key) => `${key}:${String(attributes[key])}`)
    .join('|');
};

export const normalizeSubjectBucket = (subjectBucket: SubjectBucket): SubjectBucket => {
  const roles = [...subjectBucket.roles].sort((a, b) => a.localeCompare(b));
  const attributes: AttributeBucket = {};
  Object.keys(subjectBucket.attributes)
    .sort()
    .forEach((key) => {
      attributes[key] = subjectBucket.attributes[key];
    });

  return { roles, attributes };
};

export const computePolicyScopeId = (scope: PolicyScope): string => {
  const normalizedScope: PolicyScope = {
    ...scope,
    subjectBucket: normalizeSubjectBucket(scope.subjectBucket),
  };

  const scopeString = [
    normalizedScope.tenant,
    normalizedScope.purpose,
    normalizedScope.subjectBucket.roles.join(','),
    serializeAttributes(normalizedScope.subjectBucket.attributes),
    normalizedScope.policyVersion,
    normalizedScope.schemaVersion,
  ].join('::');

  return createHash('sha256').update(scopeString).digest('hex');
};
