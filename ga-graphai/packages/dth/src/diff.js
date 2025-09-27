import { GRAPH_SORT_HINTS, TOOLCHAIN_SORT_HINTS, canonicalJSONStringify, deepEqual, isPlainObject, normalizeValue } from './hash.js';

function makeItemKey(item, hints) {
  if (isPlainObject(item)) {
    for (const hint of hints) {
      if (item[hint] !== undefined) {
        return `${hint}:${item[hint]}`;
      }
    }
  }
  return canonicalJSONStringify(item);
}

function diffList(leftList = [], rightList = [], hints = []) {
  const leftMap = new Map();
  const rightMap = new Map();
  for (const item of leftList || []) {
    const normalized = normalizeValue(item);
    const key = makeItemKey(normalized, hints);
    leftMap.set(key, normalized);
  }
  for (const item of rightList || []) {
    const normalized = normalizeValue(item);
    const key = makeItemKey(normalized, hints);
    rightMap.set(key, normalized);
  }
  const keys = new Set([...leftMap.keys(), ...rightMap.keys()]);
  const changes = [];
  for (const key of keys) {
    const left = leftMap.get(key);
    const right = rightMap.get(key);
    if (left && !right) {
      changes.push({ type: 'removed', key, left });
      continue;
    }
    if (!left && right) {
      changes.push({ type: 'added', key, right });
      continue;
    }
    if (left && right && !deepEqual(left, right)) {
      changes.push({ type: 'changed', key, left, right, diff: diffNested(left, right) });
    }
  }
  return changes;
}

function diffNested(left, right, basePath = []) {
  if (deepEqual(left, right)) {
    return [];
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    const changes = [];
    for (let index = 0; index < length; index += 1) {
      const nextPath = [...basePath, `[${index}]`];
      if (index >= left.length) {
        changes.push({ type: 'added', path: nextPath.join(''), right: right[index] });
      } else if (index >= right.length) {
        changes.push({ type: 'removed', path: nextPath.join(''), left: left[index] });
      } else {
        changes.push(...diffNested(left[index], right[index], nextPath));
      }
    }
    return changes;
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    const changes = [];
    for (const key of [...keys].sort()) {
      const nextPath = [...basePath, basePath.length === 0 ? key : `.${key}`];
      if (!(key in right)) {
        changes.push({ type: 'removed', path: nextPath.join(''), left: left[key] });
      } else if (!(key in left)) {
        changes.push({ type: 'added', path: nextPath.join(''), right: right[key] });
      } else {
        changes.push(...diffNested(left[key], right[key], nextPath));
      }
    }
    return changes;
  }
  if (left === undefined) {
    return [{ type: 'added', path: basePath.join(''), right }];
  }
  if (right === undefined) {
    return [{ type: 'removed', path: basePath.join(''), left }];
  }
  return [{ type: 'changed', path: basePath.join(''), left, right }];
}

function diffToolchain(leftToolchain = {}, rightToolchain = {}) {
  const sections = new Set([...Object.keys(leftToolchain), ...Object.keys(rightToolchain)]);
  const changes = [];
  for (const section of sections) {
    const hints = TOOLCHAIN_SORT_HINTS[section] || ['id', 'name', 'version'];
    const left = leftToolchain[section] || [];
    const right = rightToolchain[section] || [];
    if (Array.isArray(left) || Array.isArray(right)) {
      const listChanges = diffList(left, right, hints);
      for (const change of listChanges) {
        changes.push({ ...change, section });
      }
      continue;
    }
    const objectChanges = diffNested(left, right, [section]);
    for (const change of objectChanges) {
      changes.push({ ...change, section });
    }
  }
  return changes;
}

function diffExecutionGraph(leftGraph = {}, rightGraph = {}) {
  const sections = new Set([...Object.keys(leftGraph), ...Object.keys(rightGraph)]);
  const changes = [];
  for (const section of sections) {
    const hints = GRAPH_SORT_HINTS[section] || ['id', 'name'];
    const left = leftGraph[section] || [];
    const right = rightGraph[section] || [];
    if (Array.isArray(left) || Array.isArray(right)) {
      const listChanges = diffList(left, right, hints);
      for (const change of listChanges) {
        changes.push({ ...change, section });
      }
      continue;
    }
    const objectChanges = diffNested(left, right, [section]);
    for (const change of objectChanges) {
      changes.push({ ...change, section });
    }
  }
  return changes;
}

function diffDigests(leftDigests = {}, rightDigests = {}) {
  const changes = [];
  const keys = new Set([...Object.keys(leftDigests), ...Object.keys(rightDigests)]);
  for (const key of keys) {
    const left = leftDigests[key];
    const right = rightDigests[key];
    if (isPlainObject(left) && isPlainObject(right)) {
      if (!deepEqual(left, right)) {
        changes.push({ key, type: 'changed', left, right });
      }
      continue;
    }
    if (left !== right) {
      const changeType = left === undefined ? 'added' : right === undefined ? 'removed' : 'changed';
      changes.push({ key, type: changeType, left, right });
    }
  }
  return changes;
}

function diffReceipts(left, right) {
  const leftId = left?.pipeline?.id;
  const rightId = right?.pipeline?.id;
  const pipelineIdChanged = leftId !== rightId;
  const toolchainChanges = diffToolchain(left?.toolchain, right?.toolchain);
  const executionGraphChanges = diffExecutionGraph(left?.executionGraph, right?.executionGraph);
  const metadataChanges = diffNested(left?.metadata || {}, right?.metadata || {}, ['metadata']);
  const environmentChanges = diffNested(left?.environment || {}, right?.environment || {}, ['environment']);
  const parameterChanges = diffNested(left?.parameters || {}, right?.parameters || {}, ['parameters']);
  const lineageChanges = diffNested(left?.lineage || {}, right?.lineage || {}, ['lineage']);
  const digestChanges = diffDigests(left?.digests || {}, right?.digests || {});
  const hasDifferences =
    pipelineIdChanged ||
    toolchainChanges.length > 0 ||
    executionGraphChanges.length > 0 ||
    metadataChanges.length > 0 ||
    environmentChanges.length > 0 ||
    parameterChanges.length > 0 ||
    lineageChanges.length > 0 ||
    digestChanges.length > 0;
  return {
    pipeline: { left: leftId, right: rightId, changed: pipelineIdChanged },
    toolchain: toolchainChanges,
    executionGraph: executionGraphChanges,
    metadata: metadataChanges,
    environment: environmentChanges,
    parameters: parameterChanges,
    lineage: lineageChanges,
    digests: digestChanges,
    hasDifferences
  };
}

function formatListChange(change) {
  if (change.type === 'added') {
    return `+ ${change.section || 'item'} ${change.key}`;
  }
  if (change.type === 'removed') {
    return `- ${change.section || 'item'} ${change.key}`;
  }
  return `~ ${change.section || 'item'} ${change.key}`;
}

function formatReceiptDiff(diff, { includeSections = ['toolchain', 'executionGraph', 'metadata', 'environment', 'parameters', 'lineage'] } = {}) {
  if (!diff.hasDifferences) {
    return 'No differences detected. Receipts describe the same pipeline.';
  }
  const lines = [];
  if (diff.pipeline.changed) {
    lines.push(`Pipeline ID changed: ${diff.pipeline.left || '<none>'} -> ${diff.pipeline.right || '<none>'}`);
  } else {
    lines.push(`Pipeline ID unchanged: ${diff.pipeline.left || '<none>'}`);
  }
  if (diff.digests.length > 0) {
    lines.push('Digest changes:');
    for (const change of diff.digests) {
      lines.push(`  - ${change.key}: ${change.left || '<none>'} -> ${change.right || '<none>'}`);
    }
  }
  for (const section of includeSections) {
    const sectionChanges = diff[section];
    if (!sectionChanges || sectionChanges.length === 0) {
      continue;
    }
    lines.push(`${section[0].toUpperCase()}${section.slice(1)} changes:`);
    for (const change of sectionChanges) {
      if ('key' in change) {
        lines.push(`  ${formatListChange(change)}`);
        if (change.type === 'changed' && change.diff?.length) {
          for (const nested of change.diff) {
            lines.push(`    • ${nested.path || change.key}: ${JSON.stringify(nested.left)} -> ${JSON.stringify(nested.right)}`);
          }
        }
      } else {
        lines.push(`  ${change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~'} ${change.path}: ${JSON.stringify(change.left)} -> ${JSON.stringify(change.right)}`);
      }
    }
  }
  return lines.join('\n');
}

export { diffReceipts, formatReceiptDiff };
