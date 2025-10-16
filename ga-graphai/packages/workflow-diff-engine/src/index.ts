import { createHash } from 'crypto';
import {
  type ComplianceDomain,
  type DiffEdgeReweight,
  type DiffFieldDelta,
  type DiffGraphEdge,
  type DiffGraphNode,
  type DiffGraphNodeChange,
  type DiffLayer,
  type GraphDelta,
  type RiskSeverity,
  type WorkflowChangeSummary,
  type WorkflowContinuousCheck,
  type WorkflowDependencySnapshot,
  type WorkflowDiffResult,
  type WorkflowDiffRiskAnnotation,
  type WorkflowMigrationPlan,
  type WorkflowMigrationStep,
  type WorkflowMigrationTestCase,
  type WorkflowPolicyBinding,
  type WorkflowRuntimeProfile,
  type WorkflowSnapshot,
} from 'common-types';

interface LayeredGraphNode {
  id: string;
  label: string;
  layer: DiffLayer;
  attributes: Record<string, unknown>;
  baseSignature: string;
  signature: string;
  neighbors: Set<string>;
}

interface LayeredGraphEdge extends DiffGraphEdge {}

interface LayeredGraph {
  nodes: Map<string, LayeredGraphNode>;
  edges: Map<string, LayeredGraphEdge>;
  adjacency: Map<string, Set<string>>;
  fingerprint: string;
}

const LAYER_PREFIX_SEPARATOR = ':';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value && typeof value === 'object') {
    const sorted = Object.keys(value as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};
    for (const key of sorted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function hashParts(parts: string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(part);
    hash.update('|');
  }
  return hash.digest('hex');
}

function addNode(
  graph: LayeredGraph,
  node: Omit<LayeredGraphNode, 'baseSignature' | 'signature' | 'neighbors'>,
): void {
  const canonicalAttributes = canonicalize(node.attributes) as Record<
    string,
    unknown
  >;
  const baseSignature = hashParts([
    node.id,
    node.layer,
    node.label,
    stableStringify(canonicalAttributes),
  ]);
  graph.nodes.set(node.id, {
    ...node,
    attributes: canonicalAttributes,
    baseSignature,
    signature: baseSignature,
    neighbors: new Set<string>(),
  });
  if (!graph.adjacency.has(node.id)) {
    graph.adjacency.set(node.id, new Set<string>());
  }
}

function edgeKey(edge: DiffGraphEdge): string {
  return [edge.from, edge.to, edge.relation, edge.layer].join('>');
}

function addEdge(graph: LayeredGraph, edge: LayeredGraphEdge): void {
  if (!graph.nodes.has(edge.from) || !graph.nodes.has(edge.to)) {
    return;
  }
  const key = edgeKey(edge);
  if (!graph.edges.has(key)) {
    graph.edges.set(key, { ...edge });
  } else {
    // merge weights for duplicate relations by averaging
    const existing = graph.edges.get(key)!;
    if (edge.weight !== undefined) {
      const prior = existing.weight ?? edge.weight;
      existing.weight = (prior + edge.weight) / 2;
    }
  }
  graph.adjacency.get(edge.from)!.add(edge.to);
  graph.adjacency.get(edge.to)!.add(edge.from);
}

function buildLayeredGraph(snapshot: WorkflowSnapshot): LayeredGraph {
  const graph: LayeredGraph = {
    nodes: new Map<string, LayeredGraphNode>(),
    edges: new Map<string, LayeredGraphEdge>(),
    adjacency: new Map<string, Set<string>>(),
    fingerprint: '',
  };

  const workflow = snapshot.definition;

  for (const node of workflow.nodes) {
    const nodeId = `functional${LAYER_PREFIX_SEPARATOR}${node.id}`;
    addNode(graph, {
      id: nodeId,
      label: node.name ?? node.id,
      layer: 'functional',
      attributes: {
        type: node.type,
        params: node.params,
        policy: node.policy ?? {},
        estimates: node.estimates ?? {},
        produces: node.produces ?? [],
        consumes: node.consumes ?? [],
        evidenceOutputs: node.evidenceOutputs ?? [],
      },
    });
  }

  const policyNodeId = `policy${LAYER_PREFIX_SEPARATOR}workflow`;
  addNode(graph, {
    id: policyNodeId,
    label: `${workflow.workflowId}-policy`,
    layer: 'policy',
    attributes: workflow.policy,
  });

  const constraintNodeId = `policy${LAYER_PREFIX_SEPARATOR}constraints`;
  addNode(graph, {
    id: constraintNodeId,
    label: `${workflow.workflowId}-constraints`,
    layer: 'policy',
    attributes: workflow.constraints,
  });

  for (const node of workflow.nodes) {
    const nodeId = `functional${LAYER_PREFIX_SEPARATOR}${node.id}`;
    addEdge(graph, {
      from: nodeId,
      to: policyNodeId,
      relation: 'governed-by',
      layer: 'policy',
      weight: node.policy?.handlesPii ? 0.9 : 0.6,
    });
    addEdge(graph, {
      from: nodeId,
      to: constraintNodeId,
      relation: 'bounded-by',
      layer: 'policy',
      weight: 0.5,
    });
  }

  for (const edge of workflow.edges) {
    const from = `functional${LAYER_PREFIX_SEPARATOR}${edge.from}`;
    const to = `functional${LAYER_PREFIX_SEPARATOR}${edge.to}`;
    addEdge(graph, {
      from,
      to,
      relation: `flow:${edge.on}`,
      layer: 'functional',
      weight: edge.condition ? 0.8 : 0.6,
    });
  }

  attachDependencies(graph, snapshot.dependencies, workflow.workflowId);
  attachPolicyBindings(graph, snapshot.policyBindings);
  if (snapshot.runtime) {
    attachRuntime(graph, snapshot.runtime);
  }

  computeSignatures(graph);
  graph.fingerprint = fingerprintGraph(graph);
  return graph;
}

function attachDependencies(
  graph: LayeredGraph,
  dependencies: WorkflowDependencySnapshot[],
  workflowId: string,
): void {
  for (const dependency of dependencies) {
    const depId = `dependency${LAYER_PREFIX_SEPARATOR}${dependency.id}`;
    addNode(graph, {
      id: depId,
      label: dependency.name,
      layer: 'dependency',
      attributes: {
        type: dependency.type,
        version: dependency.version,
        domain: dependency.domain,
        criticality: dependency.criticality,
        owner: dependency.owner,
        tags: dependency.tags ?? [],
        metadata: dependency.metadata ?? {},
      },
    });

    const weight = dependencyWeight(dependency);
    const attachedNodes = dependency.attachedNodes ?? [];
    if (attachedNodes.length === 0) {
      addEdge(graph, {
        from: depId,
        to: `policy${LAYER_PREFIX_SEPARATOR}${workflowId}-constraints`,
        relation: 'supports',
        layer: 'dependency',
        weight,
      });
    }
    for (const nodeId of attachedNodes) {
      const functionalNode = `functional${LAYER_PREFIX_SEPARATOR}${nodeId}`;
      if (!graph.nodes.has(functionalNode)) {
        continue;
      }
      addEdge(graph, {
        from: depId,
        to: functionalNode,
        relation: 'feeds',
        layer: 'dependency',
        weight,
      });
    }
  }
}

function attachPolicyBindings(
  graph: LayeredGraph,
  bindings: WorkflowPolicyBinding[],
): void {
  for (const binding of bindings) {
    const bindingId = `policy${LAYER_PREFIX_SEPARATOR}binding-${binding.controlId}`;
    addNode(graph, {
      id: bindingId,
      label: binding.controlId,
      layer: 'policy',
      attributes: {
        domain: binding.domain,
        coverage: binding.coverage,
        description: binding.description ?? '',
        annotations: binding.annotations ?? {},
      },
    });

    const impacted = binding.impactedNodes ?? [];
    const coverageWeight = coverageToWeight(binding.coverage);
    if (impacted.length === 0) {
      addEdge(graph, {
        from: bindingId,
        to: `policy${LAYER_PREFIX_SEPARATOR}workflow`,
        relation: 'guards',
        layer: 'policy',
        weight: coverageWeight,
      });
    }
    for (const nodeId of impacted) {
      const functionalNode = `functional${LAYER_PREFIX_SEPARATOR}${nodeId}`;
      if (!graph.nodes.has(functionalNode)) {
        continue;
      }
      addEdge(graph, {
        from: bindingId,
        to: functionalNode,
        relation: 'guards',
        layer: 'policy',
        weight: coverageWeight,
      });
    }
  }
}

function attachRuntime(
  graph: LayeredGraph,
  runtime: WorkflowRuntimeProfile,
): void {
  if (runtime.resourceProfiles) {
    for (const profile of runtime.resourceProfiles) {
      const runtimeId = `runtime${LAYER_PREFIX_SEPARATOR}${profile.nodeId}`;
      addNode(graph, {
        id: runtimeId,
        label: `runtime-${profile.nodeId}`,
        layer: 'runtime',
        attributes: {
          latencyMs: profile.latencyMs ?? 0,
          costUSD: profile.costUSD ?? 0,
          cpuMillis: profile.cpuMillis ?? 0,
          memoryMb: profile.memoryMb ?? 0,
          throughputPerMin: profile.throughputPerMin ?? 0,
        },
      });
      const functionalNode = `functional${LAYER_PREFIX_SEPARATOR}${profile.nodeId}`;
      if (graph.nodes.has(functionalNode)) {
        addEdge(graph, {
          from: runtimeId,
          to: functionalNode,
          relation: 'profiles',
          layer: 'runtime',
          weight: runtimeWeight(profile),
        });
      }
    }
  }

  if (runtime.incidents) {
    for (const incident of runtime.incidents) {
      const incidentId = `runtime${LAYER_PREFIX_SEPARATOR}incident-${incident.id}`;
      addNode(graph, {
        id: incidentId,
        label: incident.summary,
        layer: 'runtime',
        attributes: {
          severity: incident.severity,
          nodes: incident.nodes ?? [],
          detectedAt: incident.detectedAt,
          resolved: incident.resolved ?? false,
        },
      });
      for (const nodeId of incident.nodes ?? []) {
        const functionalNode = `functional${LAYER_PREFIX_SEPARATOR}${nodeId}`;
        if (graph.nodes.has(functionalNode)) {
          addEdge(graph, {
            from: incidentId,
            to: functionalNode,
            relation: 'impacts',
            layer: 'runtime',
            weight: incidentWeight(incident.severity),
          });
        }
      }
    }
  }

  const statsId = `runtime${LAYER_PREFIX_SEPARATOR}summary`;
  addNode(graph, {
    id: statsId,
    label: 'runtime-stats',
    layer: 'runtime',
    attributes: runtime.stats,
  });
  for (const node of graph.nodes.values()) {
    if (node.layer === 'functional') {
      addEdge(graph, {
        from: statsId,
        to: node.id,
        relation: 'influences',
        layer: 'runtime',
        weight: 0.4,
      });
    }
  }
}

function dependencyWeight(dependency: WorkflowDependencySnapshot): number {
  switch (dependency.criticality) {
    case 'mission-critical':
      return 1;
    case 'high':
      return 0.85;
    case 'medium':
      return 0.6;
    case 'low':
      return 0.3;
    default:
      return 0.5;
  }
}

function coverageToWeight(coverage: WorkflowPolicyBinding['coverage']): number {
  switch (coverage) {
    case 'full':
      return 0.95;
    case 'partial':
      return 0.6;
    case 'none':
      return 0.2;
    default:
      return 0.5;
  }
}

function runtimeWeight(
  profile: WorkflowRuntimeProfile['resourceProfiles'][number],
): number {
  const latency = profile.latencyMs ?? 0;
  const cost = profile.costUSD ?? 0;
  const throughput = profile.throughputPerMin ?? 0;
  const score = Math.min(
    1,
    (latency / 1000 + cost / 100 + throughput / 100) / 3,
  );
  return 0.3 + score * 0.7;
}

function incidentWeight(severity: RiskSeverity): number {
  switch (severity) {
    case 'critical':
      return 1;
    case 'high':
      return 0.85;
    case 'medium':
      return 0.6;
    case 'low':
      return 0.4;
    default:
      return 0.3;
  }
}

function computeSignatures(graph: LayeredGraph): void {
  let current = new Map<string, string>();
  for (const [id, node] of graph.nodes.entries()) {
    current.set(id, node.baseSignature);
  }

  for (let i = 0; i < 2; i += 1) {
    const next = new Map<string, string>();
    for (const [id, node] of graph.nodes.entries()) {
      const neighborSignatures = [...(graph.adjacency.get(id) ?? [])]
        .map((neighborId) => current.get(neighborId) ?? '')
        .sort();
      const aggregated = hashParts([node.baseSignature, ...neighborSignatures]);
      next.set(id, aggregated);
    }
    current = next;
  }

  for (const [id, node] of graph.nodes.entries()) {
    node.signature = current.get(id) ?? node.baseSignature;
  }
}

function fingerprintGraph(graph: LayeredGraph): string {
  const nodeParts = [...graph.nodes.values()]
    .map((node) => `${node.id}:${node.signature}`)
    .sort();
  const edgeParts = [...graph.edges.values()]
    .map(
      (edge) =>
        `${edge.from}->${edge.to}:${edge.relation}:${edge.layer}:${edge.weight ?? 'na'}`,
    )
    .sort();
  return hashParts([...nodeParts, ...edgeParts]);
}

function toDiffNode(node: LayeredGraphNode): DiffGraphNode {
  return {
    id: node.id,
    label: node.label,
    layer: node.layer,
    signature: node.signature,
    attributes: node.attributes,
  };
}

function computeAttributeDelta(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DiffFieldDelta[] {
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const deltas: DiffFieldDelta[] = [];
  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (stableStringify(beforeValue) === stableStringify(afterValue)) {
      continue;
    }
    deltas.push({
      field: key,
      before: beforeValue,
      after: afterValue,
      weight: deltaWeight(beforeValue, afterValue),
    });
  }
  return deltas;
}

function deltaWeight(before: unknown, after: unknown): number {
  if (typeof before === 'number' && typeof after === 'number') {
    const baseline = Math.abs(before) < 1 ? 1 : Math.abs(before);
    return Math.min(1, Math.abs(after - before) / baseline);
  }
  if (typeof before === 'boolean' || typeof after === 'boolean') {
    return 0.75;
  }
  if (typeof before === 'string' && typeof after === 'string') {
    return before === after ? 0 : 0.5;
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    const beforeArr = Array.isArray(before) ? before : [];
    const afterArr = Array.isArray(after) ? after : [];
    const diff = Math.abs(afterArr.length - beforeArr.length);
    const base = beforeArr.length === 0 ? 1 : beforeArr.length;
    return Math.min(1, diff / base);
  }
  return 0.5;
}

function diffGraphs(baseline: LayeredGraph, target: LayeredGraph): GraphDelta {
  const addedNodes: DiffGraphNode[] = [];
  const removedNodes: DiffGraphNode[] = [];
  const changedNodes: DiffGraphNodeChange[] = [];

  for (const [id, node] of target.nodes.entries()) {
    if (!baseline.nodes.has(id)) {
      addedNodes.push(toDiffNode(node));
    }
  }
  for (const [id, node] of baseline.nodes.entries()) {
    if (!target.nodes.has(id)) {
      removedNodes.push(toDiffNode(node));
    }
  }
  for (const [id, beforeNode] of baseline.nodes.entries()) {
    if (!target.nodes.has(id)) {
      continue;
    }
    const afterNode = target.nodes.get(id)!;
    if (beforeNode.signature === afterNode.signature) {
      continue;
    }
    changedNodes.push({
      id,
      layer: beforeNode.layer,
      beforeSignature: beforeNode.signature,
      afterSignature: afterNode.signature,
      deltas: computeAttributeDelta(
        beforeNode.attributes,
        afterNode.attributes,
      ),
      beforeAttributes: beforeNode.attributes,
      afterAttributes: afterNode.attributes,
    });
  }

  const addedEdges: DiffGraphEdge[] = [];
  const removedEdges: DiffGraphEdge[] = [];
  const reweightedEdges: DiffEdgeReweight[] = [];

  for (const [key, edge] of target.edges.entries()) {
    if (!baseline.edges.has(key)) {
      addedEdges.push({ ...edge });
      continue;
    }
    const beforeEdge = baseline.edges.get(key)!;
    const beforeWeight = beforeEdge.weight ?? 0;
    const afterWeight = edge.weight ?? 0;
    if (Math.abs(beforeWeight - afterWeight) > 0.05) {
      reweightedEdges.push({
        from: edge.from,
        to: edge.to,
        relation: edge.relation,
        layer: edge.layer,
        beforeWeight,
        afterWeight,
      });
    }
  }

  for (const [key, edge] of baseline.edges.entries()) {
    if (!target.edges.has(key)) {
      removedEdges.push({ ...edge });
    }
  }

  return {
    baselineFingerprint: baseline.fingerprint,
    targetFingerprint: target.fingerprint,
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    reweightedEdges,
  };
}

function inferFunctionalDomain(
  attributes: Record<string, unknown>,
): ComplianceDomain {
  const policy = attributes.policy as { handlesPii?: boolean } | undefined;
  if (policy?.handlesPii) {
    return 'privacy';
  }
  const type = attributes.type as string | undefined;
  if (type?.includes('security')) {
    return 'security';
  }
  if (type?.includes('finance') || type?.includes('billing')) {
    return 'financial';
  }
  if (type?.includes('data') || type?.includes('ingest')) {
    return 'data';
  }
  return 'operational';
}

function inferDependencyDomain(
  attributes: Record<string, unknown>,
): ComplianceDomain {
  const domain = attributes.domain as ComplianceDomain | undefined;
  return domain ?? 'data';
}

function inferPolicyDomain(
  attributes: Record<string, unknown>,
): ComplianceDomain {
  const domain = attributes.domain as ComplianceDomain | undefined;
  return domain ?? 'regulatory';
}

function inferRuntimeDomain(): ComplianceDomain {
  return 'operational';
}

function functionalSeverity(
  changeType: 'added' | 'removed' | 'modified',
  attributes: Record<string, unknown>,
  deltas: DiffFieldDelta[],
): RiskSeverity {
  if ((attributes.policy as { handlesPii?: boolean } | undefined)?.handlesPii) {
    return changeType === 'removed' ? 'high' : 'critical';
  }
  const estimates = attributes.estimates as
    | { costUSD?: number; latencyP95Ms?: number }
    | undefined;
  if (estimates) {
    const latencyDelta = deltas.find((delta) => delta.field === 'estimates');
    if (latencyDelta && latencyDelta.weight > 0.4) {
      return 'high';
    }
  }
  if (
    changeType === 'modified' &&
    deltas.some((delta) => delta.field === 'params')
  ) {
    return 'medium';
  }
  return changeType === 'removed' ? 'high' : 'medium';
}

function dependencySeverity(
  attributes: Record<string, unknown>,
  deltas: DiffFieldDelta[],
): RiskSeverity {
  const criticality = attributes.criticality as string | undefined;
  if (criticality === 'mission-critical') {
    return 'critical';
  }
  const versionDelta = deltas.find((delta) => delta.field === 'version');
  if (versionDelta && versionDelta.weight > 0.5) {
    return 'high';
  }
  return criticality === 'high' ? 'high' : 'medium';
}

function policySeverity(
  attributes: Record<string, unknown>,
  deltas: DiffFieldDelta[],
): RiskSeverity {
  const coverageDelta = deltas.find((delta) => delta.field === 'coverage');
  if (
    coverageDelta &&
    coverageDelta.before === 'full' &&
    coverageDelta.after !== 'full'
  ) {
    return 'high';
  }
  if (
    coverageDelta &&
    coverageDelta.before === 'partial' &&
    coverageDelta.after === 'none'
  ) {
    return 'critical';
  }
  return 'medium';
}

function runtimeSeverity(deltas: DiffFieldDelta[]): RiskSeverity {
  if (
    deltas.some(
      (delta) => delta.field === 'severity' && delta.after === 'critical',
    )
  ) {
    return 'critical';
  }
  if (
    deltas.some((delta) => delta.field === 'latencyMs' && delta.weight > 0.5)
  ) {
    return 'high';
  }
  return 'medium';
}

function stripLayerPrefix(id: string): string {
  const index = id.indexOf(LAYER_PREFIX_SEPARATOR);
  return index >= 0 ? id.slice(index + 1) : id;
}

function summarizeFunctionalChanges(
  delta: GraphDelta,
  targetGraph: LayeredGraph,
  baselineGraph: LayeredGraph,
): WorkflowChangeSummary[] {
  const summaries: WorkflowChangeSummary[] = [];
  for (const node of delta.addedNodes.filter(
    (candidate) => candidate.layer === 'functional',
  )) {
    const attributes = targetGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Functional node ${node.label} added`,
      impactedNodes: [stripLayerPrefix(node.id)],
      severity: functionalSeverity('added', attributes, []),
      domain: inferFunctionalDomain(attributes),
      businessImpact: `Introduces capability ${attributes.type as string}`,
    });
  }
  for (const node of delta.removedNodes.filter(
    (candidate) => candidate.layer === 'functional',
  )) {
    const attributes = baselineGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Functional node ${node.label} removed`,
      impactedNodes: [stripLayerPrefix(node.id)],
      severity: functionalSeverity('removed', attributes, []),
      domain: inferFunctionalDomain(attributes),
      businessImpact: 'Potential loss of workflow coverage',
    });
  }
  for (const change of delta.changedNodes.filter(
    (candidate) => candidate.layer === 'functional',
  )) {
    summaries.push({
      description: `Functional node ${stripLayerPrefix(change.id)} modified`,
      impactedNodes: [stripLayerPrefix(change.id)],
      severity: functionalSeverity(
        'modified',
        change.afterAttributes,
        change.deltas,
      ),
      domain: inferFunctionalDomain(change.afterAttributes),
      businessImpact: summarizeFunctionalImpact(change),
    });
  }
  return summaries;
}

function summarizeFunctionalImpact(change: DiffGraphNodeChange): string {
  const deltas = change.deltas.map((delta) => delta.field);
  if (deltas.includes('params')) {
    return 'Parameter update requires regression of downstream analytics';
  }
  if (deltas.includes('policy')) {
    return 'Policy mutation alters approval paths for MC/Summit workloads';
  }
  if (deltas.includes('estimates')) {
    return 'Resource profile shift may affect cost and latency commitments';
  }
  return 'Topology adjustment detected';
}

function summarizeDependencyChanges(
  delta: GraphDelta,
  targetGraph: LayeredGraph,
  baselineGraph: LayeredGraph,
): WorkflowChangeSummary[] {
  const summaries: WorkflowChangeSummary[] = [];
  for (const node of delta.addedNodes.filter(
    (candidate) => candidate.layer === 'dependency',
  )) {
    const attributes = targetGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Dependency ${node.label} introduced`,
      impactedNodes: impactedFunctionalFromDependency(targetGraph, node.id),
      severity: dependencySeverity(attributes, []),
      domain: inferDependencyDomain(attributes),
      businessImpact: 'New upstream integration path requires validation',
    });
  }
  for (const node of delta.removedNodes.filter(
    (candidate) => candidate.layer === 'dependency',
  )) {
    const attributes = baselineGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Dependency ${node.label} removed`,
      impactedNodes: impactedFunctionalFromDependency(baselineGraph, node.id),
      severity: dependencySeverity(attributes, []),
      domain: inferDependencyDomain(attributes),
      businessImpact:
        'Ensure replacement coverage and archival of shared data contracts',
    });
  }
  for (const change of delta.changedNodes.filter(
    (candidate) => candidate.layer === 'dependency',
  )) {
    const attributes = change.afterAttributes;
    summaries.push({
      description: `Dependency ${stripLayerPrefix(change.id)} version/policy drift`,
      impactedNodes: impactedFunctionalFromDependency(targetGraph, change.id),
      severity: dependencySeverity(attributes, change.deltas),
      domain: inferDependencyDomain(attributes),
      businessImpact: summarizeDependencyImpact(change),
    });
  }
  return summaries;
}

function summarizeDependencyImpact(change: DiffGraphNodeChange): string {
  const versionDelta = change.deltas.find((delta) => delta.field === 'version');
  if (versionDelta) {
    return `Upgrade from ${versionDelta.before as string} to ${versionDelta.after as string} impacts shared data contracts`;
  }
  if (change.deltas.some((delta) => delta.field === 'criticality')) {
    return 'Criticality shift demands reassessment of SLO alignment';
  }
  return 'Dependency metadata drift detected';
}

function impactedFunctionalFromDependency(
  graph: LayeredGraph,
  dependencyId: string,
): string[] {
  const edgeSources = [...graph.edges.values()].filter(
    (edge) => edge.layer === 'dependency' && edge.from === dependencyId,
  );
  const impacted = edgeSources
    .map((edge) => stripLayerPrefix(edge.to))
    .filter((id) =>
      graph.nodes.has(`functional${LAYER_PREFIX_SEPARATOR}${id}`),
    );
  return [...new Set(impacted)];
}

function summarizePolicyChanges(
  delta: GraphDelta,
  targetGraph: LayeredGraph,
  baselineGraph: LayeredGraph,
): WorkflowChangeSummary[] {
  const summaries: WorkflowChangeSummary[] = [];
  const addedPolicyNodes = delta.addedNodes.filter(
    (node) => node.layer === 'policy',
  );
  for (const node of addedPolicyNodes) {
    const attributes = targetGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Policy binding ${node.label} added`,
      impactedNodes: impactedFunctionalFromPolicy(targetGraph, node.id),
      severity: policySeverity(attributes, []),
      domain: inferPolicyDomain(attributes),
      businessImpact: 'New control mapping introduced for Summit/MC governance',
    });
  }
  const removedPolicyNodes = delta.removedNodes.filter(
    (node) => node.layer === 'policy',
  );
  for (const node of removedPolicyNodes) {
    const attributes = baselineGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Policy binding ${node.label} removed`,
      impactedNodes: impactedFunctionalFromPolicy(baselineGraph, node.id),
      severity: policySeverity(attributes, []),
      domain: inferPolicyDomain(attributes),
      businessImpact: 'Control gap detected; review compensating safeguards',
    });
  }
  for (const change of delta.changedNodes.filter(
    (candidate) => candidate.layer === 'policy',
  )) {
    summaries.push({
      description: `Policy binding ${stripLayerPrefix(change.id)} coverage changed`,
      impactedNodes: impactedFunctionalFromPolicy(targetGraph, change.id),
      severity: policySeverity(change.afterAttributes, change.deltas),
      domain: inferPolicyDomain(change.afterAttributes),
      businessImpact: summarizePolicyImpact(change),
    });
  }
  return summaries;
}

function summarizePolicyImpact(change: DiffGraphNodeChange): string {
  const coverageDelta = change.deltas.find(
    (delta) => delta.field === 'coverage',
  );
  if (coverageDelta) {
    return `Coverage shifted from ${coverageDelta.before as string} to ${coverageDelta.after as string}`;
  }
  return 'Policy annotation updates detected';
}

function impactedFunctionalFromPolicy(
  graph: LayeredGraph,
  policyId: string,
): string[] {
  const edges = [...graph.edges.values()].filter(
    (edge) =>
      edge.layer === 'policy' &&
      edge.from === policyId &&
      edge.to.startsWith('functional:'),
  );
  return [...new Set(edges.map((edge) => stripLayerPrefix(edge.to)))];
}

function summarizeRuntimeChanges(
  delta: GraphDelta,
  targetGraph: LayeredGraph,
  baselineGraph: LayeredGraph,
): WorkflowChangeSummary[] {
  const summaries: WorkflowChangeSummary[] = [];
  for (const node of delta.addedNodes.filter(
    (candidate) => candidate.layer === 'runtime',
  )) {
    const attributes = targetGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Runtime signal ${node.label} detected`,
      impactedNodes: impactedFunctionalFromRuntime(targetGraph, node.id),
      severity: runtimeSeverity([]),
      domain: inferRuntimeDomain(),
      businessImpact: 'New runtime telemetry requires baseline alignment',
    });
  }
  for (const node of delta.removedNodes.filter(
    (candidate) => candidate.layer === 'runtime',
  )) {
    const attributes = baselineGraph.nodes.get(node.id)?.attributes ?? {};
    summaries.push({
      description: `Runtime signal ${node.label} removed`,
      impactedNodes: impactedFunctionalFromRuntime(baselineGraph, node.id),
      severity: runtimeSeverity([]),
      domain: inferRuntimeDomain(),
      businessImpact:
        'Runtime guardrail removed; verify observability coverage',
    });
  }
  for (const change of delta.changedNodes.filter(
    (candidate) => candidate.layer === 'runtime',
  )) {
    summaries.push({
      description: `Runtime signal ${stripLayerPrefix(change.id)} drift`,
      impactedNodes: impactedFunctionalFromRuntime(targetGraph, change.id),
      severity: runtimeSeverity(change.deltas),
      domain: inferRuntimeDomain(),
      businessImpact: summarizeRuntimeImpact(change),
    });
  }
  return summaries;
}

function impactedFunctionalFromRuntime(
  graph: LayeredGraph,
  runtimeId: string,
): string[] {
  const edges = [...graph.edges.values()].filter(
    (edge) =>
      edge.layer === 'runtime' &&
      edge.from === runtimeId &&
      edge.to.startsWith('functional:'),
  );
  return [...new Set(edges.map((edge) => stripLayerPrefix(edge.to)))];
}

function summarizeRuntimeImpact(change: DiffGraphNodeChange): string {
  if (change.deltas.some((delta) => delta.field === 'latencyMs')) {
    return 'Latency distribution shifted; verify SLO regression tests';
  }
  if (change.deltas.some((delta) => delta.field === 'costUSD')) {
    return 'Cost profile changed; rerun budgeting scenarios';
  }
  if (
    change.deltas.some(
      (delta) => delta.field === 'severity' && delta.after === 'critical',
    )
  ) {
    return 'Critical incident recorded; execute incident postmortem';
  }
  return 'Runtime telemetry adjusted';
}

function collectRiskAnnotations(
  functionalChanges: WorkflowChangeSummary[],
  dependencyChanges: WorkflowChangeSummary[],
  policyChanges: WorkflowChangeSummary[],
  runtimeChanges: WorkflowChangeSummary[],
  target: WorkflowSnapshot,
): WorkflowDiffRiskAnnotation[] {
  const annotations: WorkflowDiffRiskAnnotation[] = [];
  const allChanges = [
    ...functionalChanges,
    ...dependencyChanges,
    ...policyChanges,
    ...runtimeChanges,
  ];
  for (const change of allChanges) {
    if (change.severity === 'info' || change.severity === 'low') {
      continue;
    }
    annotations.push({
      domain: change.domain,
      severity: change.severity,
      rationale: change.description,
      impactedNodes: change.impactedNodes,
      recommendedControls: recommendControls(change.domain, change.severity),
      businessImpact: change.businessImpact,
    });
  }

  const runtime = target.runtime;
  if (runtime?.incidents) {
    for (const incident of runtime.incidents) {
      if (incident.severity === 'low' || incident.severity === 'info') {
        continue;
      }
      annotations.push({
        domain: 'operational',
        severity: incident.severity,
        rationale: `Runtime incident ${incident.summary}`,
        impactedNodes: incident.nodes ?? [],
        recommendedControls: [
          'Expand synthetic canaries',
          'Increase anomaly detector sensitivity',
        ],
        businessImpact: 'Potential service disruption during merge window',
      });
    }
  }

  return dedupeAnnotations(annotations);
}

function dedupeAnnotations(
  annotations: WorkflowDiffRiskAnnotation[],
): WorkflowDiffRiskAnnotation[] {
  const map = new Map<string, WorkflowDiffRiskAnnotation>();
  for (const annotation of annotations) {
    const key = `${annotation.domain}:${annotation.rationale}`;
    if (!map.has(key)) {
      map.set(key, annotation);
    } else {
      const existing = map.get(key)!;
      const mergedNodes = [
        ...new Set([...existing.impactedNodes, ...annotation.impactedNodes]),
      ];
      const mergedControls = [
        ...new Set([
          ...existing.recommendedControls,
          ...annotation.recommendedControls,
        ]),
      ];
      map.set(key, {
        ...existing,
        impactedNodes: mergedNodes,
        recommendedControls: mergedControls,
      });
    }
  }
  return [...map.values()];
}

function recommendControls(
  domain: ComplianceDomain,
  severity: RiskSeverity,
): string[] {
  const controls: string[] = [];
  if (domain === 'privacy') {
    controls.push('Execute differential privacy validation');
  }
  if (domain === 'data') {
    controls.push('Rebuild lineage graph and validate schema contracts');
  }
  if (domain === 'regulatory') {
    controls.push('Run automated policy attestation suite');
  }
  if (domain === 'security') {
    controls.push('Trigger threat modeling delta review');
  }
  if (severity === 'critical') {
    controls.push('Require executive sign-off prior to merge');
  }
  return controls.length > 0
    ? controls
    : ['Document change rationale in Summit compliance console'];
}

function buildMigrationPlan(
  functional: WorkflowChangeSummary[],
  dependency: WorkflowChangeSummary[],
  policy: WorkflowChangeSummary[],
  runtime: WorkflowChangeSummary[],
  target: WorkflowSnapshot,
): WorkflowMigrationPlan {
  const steps: WorkflowMigrationStep[] = [];
  if (functional.length > 0) {
    steps.push({
      title: 'Apply workflow topology updates',
      description: 'Synchronize node graph with Summit/MC orchestrators',
      commands: [
        `ga graph apply --workflow ${target.definition.workflowId} --version ${target.definition.version}`,
        'ga graph validate --scope functional',
      ],
    });
  }
  if (dependency.length > 0) {
    steps.push({
      title: 'Reconcile dependency contracts',
      description: 'Update service/package versions and regenerate SBOM',
      commands: [
        'npm run sbom:refresh',
        'ga contracts verify --mode connected',
      ],
    });
  }
  if (policy.length > 0) {
    steps.push({
      title: 'Re-baseline compliance controls',
      description: 'Ensure coverage parity across MC privacy/security domains',
      commands: [
        'ga compliance attestation --autofix',
        'ga policy diff --enforce gapless',
      ],
    });
  }
  if (runtime.length > 0) {
    steps.push({
      title: 'Execute runtime regression suite',
      description: 'Validate latency, cost, and incident recovery scripts',
      commands: [
        'ga runtime simulate --scenarios peak,steady',
        'ga runtime assert --checks slo,spend',
      ],
    });
  }

  const tests: WorkflowMigrationTestCase[] = [];
  if (
    functional.some((change) =>
      change.businessImpact?.includes('Parameter update'),
    )
  ) {
    tests.push({
      name: 'functional-regression',
      description: 'Ensure new parameters maintain deterministic outputs',
      assertions: [
        'Compare baseline vs target golden dataset',
        'Verify checksum parity',
      ],
    });
  }
  if (dependency.length > 0) {
    tests.push({
      name: 'supply-chain-scan',
      description: 'Validate dependency SBOM and provenance chain',
      assertions: ['All dependencies signed', 'License compatibility verified'],
    });
  }
  if (policy.length > 0) {
    tests.push({
      name: 'policy-regression',
      description: 'Confirm policy coverage has no gaps',
      assertions: ['Coverage >= baseline', 'All privacy controls attested'],
    });
  }
  if (runtime.length > 0) {
    tests.push({
      name: 'runtime-drift',
      description: 'Ensure runtime drift is within guardrails',
      assertions: ['Latency delta < 15%', 'Cost delta < 10%'],
    });
  }

  if (tests.length === 0) {
    tests.push({
      name: 'baseline-verification',
      description: 'Validate that no unintended regressions exist',
      assertions: ['Run ga graph audit --full'],
    });
  }

  return { steps, tests };
}

function buildContinuousChecks(
  riskAnnotations: WorkflowDiffRiskAnnotation[],
): WorkflowContinuousCheck[] {
  const checks: WorkflowContinuousCheck[] = [
    {
      name: 'stratified-graph-integrity',
      description: 'Compare layered graph fingerprints for every merge request',
      trigger: 'pre-merge',
    },
    {
      name: 'gapless-merge-simulator',
      description: 'Execute simulated merges ensuring no control gaps remain',
      trigger: 'pre-merge',
    },
  ];

  if (riskAnnotations.some((annotation) => annotation.domain === 'privacy')) {
    checks.push({
      name: 'privacy-regression-circuit',
      description:
        'Continuously assert privacy controls with synthetic payloads',
      trigger: 'scheduled',
    });
  }
  if (
    riskAnnotations.some((annotation) => annotation.domain === 'operational')
  ) {
    checks.push({
      name: 'runtime-drift-watch',
      description: 'Monitor latency and cost drift after deployment',
      trigger: 'post-merge',
    });
  }
  if (riskAnnotations.some((annotation) => annotation.domain === 'data')) {
    checks.push({
      name: 'lineage-continuity-check',
      description: 'Ensure data lineage graph remains gapless after merges',
      trigger: 'pre-merge',
    });
  }

  return checks;
}

export function diffWorkflowSnapshots(
  baseline: WorkflowSnapshot,
  target: WorkflowSnapshot,
): WorkflowDiffResult {
  const baselineGraph = buildLayeredGraph(baseline);
  const targetGraph = buildLayeredGraph(target);
  const graphDelta = diffGraphs(baselineGraph, targetGraph);

  const functionalChanges = summarizeFunctionalChanges(
    graphDelta,
    targetGraph,
    baselineGraph,
  );
  const dependencyChanges = summarizeDependencyChanges(
    graphDelta,
    targetGraph,
    baselineGraph,
  );
  const policyChanges = summarizePolicyChanges(
    graphDelta,
    targetGraph,
    baselineGraph,
  );
  const runtimeChanges = summarizeRuntimeChanges(
    graphDelta,
    targetGraph,
    baselineGraph,
  );

  const riskAnnotations = collectRiskAnnotations(
    functionalChanges,
    dependencyChanges,
    policyChanges,
    runtimeChanges,
    target,
  );

  const migrationPlan = buildMigrationPlan(
    functionalChanges,
    dependencyChanges,
    policyChanges,
    runtimeChanges,
    target,
  );

  const continuousChecks = buildContinuousChecks(riskAnnotations);

  return {
    baseline,
    target,
    graphDelta,
    functionalChanges,
    dependencyChanges,
    policyChanges,
    runtimeChanges,
    riskAnnotations,
    migrationPlan,
    continuousChecks,
  };
}
