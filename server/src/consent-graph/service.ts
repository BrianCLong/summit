import {
  CONSENT_GRAPH_EDGE_HISTORY,
  CONSENT_GRAPH_NODES,
  CONSENT_POLICY_VERSIONS,
} from './fixtures.ts';
import type { ConsentEdgeRecord } from './types.ts';
import {
  ConsentEdge,
  ConsentGraphSnapshot,
  ConsentPolicyDiff,
  ConsentPolicyVersion,
  ConsentRevocationImpact,
  SubjectImpact,
  ImpactedFlow,
} from './types.ts';
import { selectActiveRecords, toDate } from './temporal.ts';

const nodeMap = new Map(CONSENT_GRAPH_NODES.map((node) => [node.id, node]));

function materializeEdge(record: ConsentEdgeRecord): ConsentEdge {
  return {
    id: record.edgeId,
    type: record.type,
    fromId: record.fromId,
    toId: record.toId,
    metadata: record.metadata,
    validInterval: record.validInterval,
    txInterval: record.txInterval,
  };
}

function snapshotEdges(validTime: string, txTime: string): ConsentEdge[] {
  const validAt = toDate(validTime);
  const txAt = toDate(txTime);
  const active = selectActiveRecords(CONSENT_GRAPH_EDGE_HISTORY, validAt, txAt);
  return active.map(materializeEdge);
}

function uniqueNodesFromEdges(edges: ConsentEdge[]) {
  const ids = new Set<string>();
  edges.forEach((edge) => {
    ids.add(edge.fromId);
    ids.add(edge.toId);
    const flow = edge.metadata?.flow;
    if (flow) {
      flow.delegationChain.forEach((delegationId) => ids.add(delegationId));
      ids.add(flow.subjectId);
      ids.add(flow.scopeId);
      ids.add(flow.purposeId);
    }
  });
  return Array.from(ids)
    .map((id) => nodeMap.get(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));
}

export function listConsentPolicyVersions(): ConsentPolicyVersion[] {
  return CONSENT_POLICY_VERSIONS.map((version) => ({ ...version }));
}

export function getConsentGraphSnapshot(validTime: string, txTime: string): ConsentGraphSnapshot {
  const edges = snapshotEdges(validTime, txTime);
  const nodes = uniqueNodesFromEdges(edges);
  return {
    asOfValid: validTime,
    asOfTx: txTime,
    nodes,
    edges,
  };
}

export function diffConsentPolicies(baseVersionId: string, compareVersionId: string): ConsentPolicyDiff {
  const baseVersion = CONSENT_POLICY_VERSIONS.find((version) => version.id === baseVersionId);
  const compareVersion = CONSENT_POLICY_VERSIONS.find((version) => version.id === compareVersionId);

  if (!baseVersion || !compareVersion) {
    throw new Error('Unknown consent policy version');
  }

  const baseSnapshot = getConsentGraphSnapshot(baseVersion.validTime, baseVersion.txTime);
  const compareSnapshot = getConsentGraphSnapshot(compareVersion.validTime, compareVersion.txTime);

  const baseEdgeMap = new Map(baseSnapshot.edges.map((edge) => [edge.id, edge]));
  const compareEdgeMap = new Map(compareSnapshot.edges.map((edge) => [edge.id, edge]));

  const added: ConsentEdge[] = [];
  const removed: ConsentEdge[] = [];

  compareSnapshot.edges.forEach((edge) => {
    if (!baseEdgeMap.has(edge.id)) {
      added.push(edge);
    }
  });

  baseSnapshot.edges.forEach((edge) => {
    if (!compareEdgeMap.has(edge.id)) {
      removed.push(edge);
    }
  });

  const unchangedCount = baseSnapshot.edges.length - removed.length;

  return {
    baseVersionId,
    compareVersionId,
    added,
    removed,
    unchangedCount,
  };
}

export function analyzeConsentRevocationImpact(
  purposeId: string,
  validTime: string,
  txTime: string,
): ConsentRevocationImpact {
  const purpose = nodeMap.get(purposeId);
  if (!purpose) {
    throw new Error(`Unknown purpose ${purposeId}`);
  }

  const snapshot = getConsentGraphSnapshot(validTime, txTime);
  const flowEdges = snapshot.edges.filter((edge) => edge.type === 'SUBJECT_SCOPE_FLOW');

  const impactedEdges = flowEdges.filter((edge) => edge.metadata?.flow?.purposeId === purposeId);

  const bySubject = new Map<string, SubjectImpact>();

  impactedEdges.forEach((edge) => {
    const flow = edge.metadata?.flow;
    if (!flow) {
      return;
    }
    const subjectNode = nodeMap.get(flow.subjectId);
    const scopeNode = nodeMap.get(flow.scopeId);
    if (!subjectNode || !scopeNode) {
      return;
    }
    const delegations: ImpactedFlow['delegations'] = flow.delegationChain
      .map((delegationId) => nodeMap.get(delegationId))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));

    let subjectImpact = bySubject.get(flow.subjectId);
    if (!subjectImpact) {
      subjectImpact = { subject: subjectNode, flows: [] };
      bySubject.set(flow.subjectId, subjectImpact);
    }

    subjectImpact.flows.push({
      flow,
      scope: scopeNode,
      delegations,
    });
  });

  const impactedSubjects = Array.from(bySubject.values()).map((impact) => ({
    subject: impact.subject,
    flows: impact.flows.sort((a, b) => a.flow.id.localeCompare(b.flow.id)),
  }));

  impactedSubjects.sort((a, b) => a.subject.id.localeCompare(b.subject.id));

  return {
    purpose,
    totalImpactedFlows: impactedEdges.length,
    impactedSubjects,
  };
}
