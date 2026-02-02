import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function compareByCodeUnit(left, right) {
  if (left === right) return 0;
  const leftLength = left.length;
  const rightLength = right.length;
  const minLength = Math.min(leftLength, rightLength);
  for (let index = 0; index < minLength; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (leftCode !== rightCode) {
      return leftCode < rightCode ? -1 : 1;
    }
  }
  return leftLength < rightLength ? -1 : 1;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort(compareByCodeUnit)) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function normalizeRelativePath(root, target) {
  const relative = path.relative(root, target);
  return relative.split(path.sep).join('/');
}

function hashStringList(values) {
  const sorted = values.slice().sort(compareByCodeUnit);
  const joined = `${sorted.join('\n')}\n`;
  return { sorted, sha256: sha256Hex(Buffer.from(joined, 'utf8')) };
}

function writeDeterministicJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const serialized = stableJson(payload);
  fs.writeFileSync(filePath, serialized, 'utf8');
  return serialized;
}

export {
  compareByCodeUnit,
  hashStringList,
  normalizeRelativePath,
  sha256Hex,
  stableJson,
  writeDeterministicJson,
};
