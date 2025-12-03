import path from 'node:path';
import { canonicalJSONStringify } from './hash.js';

function countToolchainComponents(toolchain = {}) {
  const counts = {};
  let total = 0;
  for (const [key, value] of Object.entries(toolchain)) {
    if (Array.isArray(value)) {
      counts[key] = value.length;
      total += value.length;
    }
  }
  return { counts, total };
}

function summarizeExecutionGraph(graph = {}) {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
  const edges = Array.isArray(graph.edges) ? graph.edges.length : 0;
  const stages = Array.isArray(graph.stages) ? graph.stages.length : 0;
  return { nodes, edges, stages };
}

function pruneEmpty(value) {
  if (Array.isArray(value)) {
    const array = value
      .map((entry) => pruneEmpty(entry))
      .filter((entry) => entry !== undefined);
    return array.length > 0 ? array : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, val]) => [key, pruneEmpty(val)])
      .filter(([, val]) => val !== undefined);
    if (entries.length === 0) {
      return undefined;
    }
    const result = {};
    for (const [key, val] of entries) {
      result[key] = val;
    }
    return result;
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  return value;
}

function buildReceipt({
  manifest,
  manifestPath,
  manifestFormat,
  manifestRawHash,
  normalized,
  componentDigests,
  canonicalManifestHash,
  pipelineId,
  algorithm,
  stats
}) {
  const computedAt = new Date().toISOString();
  const toolchain = normalized.toolchain || {};
  const executionGraph = normalized.executionGraph || {};
  const { counts, total } = countToolchainComponents(toolchain);
  const graphSummary = summarizeExecutionGraph(executionGraph);
  const summary = {
    toolchain: {
      total,
      byType: counts
    },
    executionGraph: graphSummary
  };
  const digests = {
    algorithm,
    pipeline: pipelineId,
    canonicalManifest: canonicalManifestHash,
    rawManifest: manifestRawHash,
    components: componentDigests
  };
  const source = pruneEmpty({
    manifestPath: manifestPath ? path.resolve(manifestPath) : undefined,
    format: manifestFormat,
    bytes: stats?.size,
    modifiedAt: stats?.mtime ? stats.mtime.toISOString() : undefined
  });
  const integrations = {
    dpec: { pipelineId },
    spar: { pipelineId }
  };
  const receipt = pruneEmpty({
    schemaVersion: 'dth-receipt/v1',
    computedAt,
    pipeline: pruneEmpty({
      id: pipelineId,
      name: normalized.name || manifest?.name,
      version: manifest?.version,
      description: manifest?.description
    }),
    summary,
    toolchain,
    executionGraph,
    metadata: normalized.metadata,
    environment: normalized.environment,
    parameters: normalized.parameters,
    lineage: normalized.lineage,
    digests,
    source,
    integrations,
    canonicalManifest: canonicalJSONStringify(normalized)
  });
  return receipt;
}

export { buildReceipt };
