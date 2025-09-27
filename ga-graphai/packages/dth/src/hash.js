import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const TOOLCHAIN_SORT_HINTS = {
  compilers: ['id', 'name', 'version', 'path'],
  libraries: ['id', 'name', 'version', 'path'],
  kernels: ['id', 'name', 'version', 'image', 'path'],
  drivers: ['id', 'name', 'version'],
  runtimes: ['id', 'name', 'version'],
  cuda: ['version', 'driver'],
  frameworks: ['id', 'name', 'version'],
  plugins: ['id', 'name', 'version']
};

const GRAPH_SORT_HINTS = {
  nodes: ['id', 'name'],
  edges: ['id', 'from', 'to', 'artifact'],
  stages: ['id', 'name']
};

const FIELDS_TO_DROP = new Set(['pipelineId', 'pipeline_id', 'hash', 'hashes', 'receipt', 'receipts']);

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    const array = [];
    for (const entry of value) {
      const normalized = normalizeValue(entry);
      if (normalized !== undefined) {
        array.push(normalized);
      }
    }
    return array;
  }
  if (isPlainObject(value)) {
    const entries = [];
    for (const [key, val] of Object.entries(value)) {
      if (FIELDS_TO_DROP.has(key)) {
        continue;
      }
      const normalized = normalizeValue(val);
      if (normalized !== undefined) {
        entries.push([key, normalized]);
      }
    }
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result = {};
    for (const [key, val] of entries) {
      result[key] = val;
    }
    return result;
  }
  if (value === undefined) {
    return undefined;
  }
  return value;
}

function inferSortHints(section, hintsMap) {
  if (Array.isArray(section) && section.length > 0) {
    return ['id', 'name', 'key'];
  }
  return hintsMap || [];
}

function makeSortKey(item, hints) {
  if (isPlainObject(item)) {
    for (const hint of hints) {
      if (item[hint] !== undefined) {
        return String(item[hint]);
      }
    }
  }
  return JSON.stringify(item);
}

function sortArray(value, hints = []) {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = value
    .map((item) => normalizeValue(item))
    .filter((item) => item !== undefined);
  const uniqueHints = hints.length > 0 ? hints : inferSortHints(normalized, hints);
  normalized.sort((left, right) => {
    const leftKey = makeSortKey(left, uniqueHints);
    const rightKey = makeSortKey(right, uniqueHints);
    if (leftKey < rightKey) {
      return -1;
    }
    if (leftKey > rightKey) {
      return 1;
    }
    return 0;
  });
  return normalized;
}

function normalizeToolchain(toolchain) {
  const normalized = {};
  for (const [key, value] of Object.entries(toolchain)) {
    if (Array.isArray(value)) {
      const hints = TOOLCHAIN_SORT_HINTS[key] || ['id', 'name', 'version'];
      normalized[key] = sortArray(value, hints);
      continue;
    }
    if (isPlainObject(value)) {
      normalized[key] = normalizeValue(value);
      continue;
    }
    if (value !== undefined) {
      normalized[key] = value;
    }
  }
  return normalized;
}

function normalizeExecutionGraph(graph) {
  const normalized = {};
  for (const [key, value] of Object.entries(graph)) {
    if (Array.isArray(value)) {
      const hints = GRAPH_SORT_HINTS[key] || ['id', 'name'];
      if (key === 'edges') {
        normalized[key] = sortArray(
          value.map((edge) => {
            const normalEdge = normalizeValue(edge);
            if (isPlainObject(normalEdge)) {
              const canonical = { ...normalEdge };
              if (canonical.from !== undefined && canonical.to !== undefined) {
                canonical._edgeKey = `${canonical.from}->${canonical.to}`;
              }
              return canonical;
            }
            return normalEdge;
          }),
          ['_edgeKey', ...hints]
        ).map((edge) => {
          if (isPlainObject(edge)) {
            const { _edgeKey, ...rest } = edge;
            return rest;
          }
          return edge;
        });
        continue;
      }
      normalized[key] = sortArray(value, hints);
      continue;
    }
    if (isPlainObject(value)) {
      normalized[key] = normalizeValue(value);
      continue;
    }
    if (value !== undefined) {
      normalized[key] = value;
    }
  }
  return normalized;
}

function canonicalJSONStringify(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJSONStringify(entry)).join(',')}]`;
  }
  const entries = Object.entries(value || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalJSONStringify(val)}`)
    .join(',')}}`;
}

function computeDigest(value, algorithm) {
  const hash = createHash(algorithm);
  hash.update(canonicalJSONStringify(value));
  return hash.digest('hex');
}

function normalizeManifest(manifest) {
  const base = isPlainObject(manifest) ? manifest : {};
  const normalized = normalizeValue(base) || {};
  if (normalized.toolchain && isPlainObject(normalized.toolchain)) {
    normalized.toolchain = normalizeToolchain(normalized.toolchain);
  }
  if (normalized.executionGraph && isPlainObject(normalized.executionGraph)) {
    normalized.executionGraph = normalizeExecutionGraph(normalized.executionGraph);
  }
  if (Array.isArray(normalized.tags)) {
    normalized.tags = [...normalized.tags].sort();
  }
  return normalized;
}

function deepEqual(left, right) {
  return isDeepStrictEqual(left, right);
}

function computeComponentDigests(normalized, algorithm) {
  const sections = {
    toolchain: normalized.toolchain || {},
    executionGraph: normalized.executionGraph || {},
    metadata: normalized.metadata || {},
    environment: normalized.environment || {},
    parameters: normalized.parameters || {},
    lineage: normalized.lineage || {}
  };
  const digests = {};
  for (const [key, value] of Object.entries(sections)) {
    digests[key] = computeDigest(value, algorithm);
  }
  return digests;
}

function computePipelineIdentity(manifest, options = {}) {
  const algorithm = options.algorithm || 'sha256';
  const normalized = normalizeManifest(manifest);
  const canonical = canonicalJSONStringify(normalized);
  const hash = createHash(algorithm);
  hash.update(canonical);
  const pipelineId = hash.digest('hex');
  const componentDigests = computeComponentDigests(normalized, algorithm);
  const canonicalManifestHash = computeDigest(normalized, 'sha256');
  return {
    id: pipelineId,
    algorithm,
    normalized,
    canonical,
    canonicalManifestHash,
    componentDigests
  };
}

export {
  GRAPH_SORT_HINTS,
  TOOLCHAIN_SORT_HINTS,
  canonicalJSONStringify,
  computeComponentDigests,
  computeDigest,
  computePipelineIdentity,
  deepEqual,
  isPlainObject,
  normalizeExecutionGraph,
  normalizeManifest,
  normalizeToolchain,
  normalizeValue,
  sortArray
};
