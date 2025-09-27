export interface CacheKeyParts {
  resourceId: string;
  tenant: string;
  subjectClass: string;
  policyHash: string;
  locale: string;
}

const DELIMITER = '|';
const ESCAPE = '\\';

const escapeSegment = (value: string): string => {
  return value.replace(/\\/g, `${ESCAPE}${ESCAPE}`).replace(/\|/g, `${ESCAPE}${DELIMITER}`);
};

export const serializeCacheKey = (parts: CacheKeyParts): string => {
  const segments = [parts.resourceId, parts.tenant, parts.subjectClass, parts.policyHash, parts.locale];
  return segments.map(escapeSegment).join(DELIMITER);
};

export const parseCacheKey = (key: string): CacheKeyParts => {
  if (!key) {
    throw new Error('empty cache key');
  }
  const segments: string[] = [];
  let buffer = '';
  let escaping = false;
  for (const char of key) {
    if (escaping) {
      buffer += char;
      escaping = false;
      continue;
    }
    if (char === ESCAPE) {
      escaping = true;
      continue;
    }
    if (char === DELIMITER) {
      segments.push(buffer);
      buffer = '';
      continue;
    }
    buffer += char;
  }
  segments.push(buffer);

  if (segments.length !== 5) {
    throw new Error(`unexpected cache key segment count: ${segments.length}`);
  }

  const [resourceId, tenant, subjectClass, policyHash, locale] = segments;
  return { resourceId, tenant, subjectClass, policyHash, locale };
};

