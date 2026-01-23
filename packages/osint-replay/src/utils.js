import crypto from 'node:crypto';

export const compareStrings = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;

export const stableSort = (items) => [...items].sort(compareStrings);

export const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item));
    return `[${items.join(',')}]`;
  }

  const keys = stableSort(Object.keys(value));
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`,
  );
  return `{${entries.join(',')}}`;
};

export const sha256Hex = (input) =>
  crypto.createHash('sha256').update(input).digest('hex');

export const normalizeEntities = (entities) =>
  stableSort(
    entities
      .filter((entity) => entity && entity.trim().length > 0)
      .map((entity) => entity.trim().toLowerCase()),
  );

export const normalizeUrls = (urls) =>
  stableSort(urls.filter((url) => url && url.trim().length > 0));
