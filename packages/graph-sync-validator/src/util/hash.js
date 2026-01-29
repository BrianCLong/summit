import crypto from 'node:crypto';

function sortObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObject(obj[key]);
      return result;
    }, {});
}

export function canonicalHash(obj) {
  const sorted = sortObject(obj);
  const str = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(str).digest('hex');
}
