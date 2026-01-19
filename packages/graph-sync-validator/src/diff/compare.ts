import { NormEdge, NormNode, edgeKey, nodeKey } from './normalizers.js';

export type Drift = {
  missingNodes: NormNode[];
  extraNodes: NormNode[];
  mismatchedNodes: Array<{ key: string; pg: NormNode; neo: NormNode }>;

  missingEdges: NormEdge[];
  extraEdges: NormEdge[];
  mismatchedEdges: Array<{ key: string; pg: NormEdge; neo: NormEdge }>;

  matchedNodes: number;
  matchedEdges: number;
  parity: number;
};

function indexByKey<T>(items: T[], keyFn: (t: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return map;
}

export function compareNormalized(
  pgNodes: NormNode[],
  neoNodes: NormNode[],
  pgEdges: NormEdge[],
  neoEdges: NormEdge[],
): Drift {
  const pgN = indexByKey(pgNodes, nodeKey);
  const neoN = indexByKey(neoNodes, nodeKey);

  const missingNodes: NormNode[] = [];
  const extraNodes: NormNode[] = [];
  const mismatchedNodes: Array<{ key: string; pg: NormNode; neo: NormNode }> =
    [];

  let matchedNodes = 0;

  for (const [key, pgNode] of pgN.entries()) {
    const neoNode = neoN.get(key);
    if (!neoNode) {
      missingNodes.push(pgNode);
      continue;
    }
    if (
      pgNode.propsHash !== neoNode.propsHash ||
      pgNode.labels.join('|') !== neoNode.labels.join('|')
    ) {
      mismatchedNodes.push({ key, pg: pgNode, neo: neoNode });
    } else {
      matchedNodes += 1;
    }
  }

  for (const [key, neoNode] of neoN.entries()) {
    if (!pgN.has(key)) {
      extraNodes.push(neoNode);
    }
  }

  const pgE = indexByKey(pgEdges, (edge) => edgeKey(edge));
  const neoE = indexByKey(neoEdges, (edge) => edgeKey(edge));

  const missingEdges: NormEdge[] = [];
  const extraEdges: NormEdge[] = [];
  const mismatchedEdges: Array<{ key: string; pg: NormEdge; neo: NormEdge }> =
    [];
  let matchedEdges = 0;

  for (const [key, pgEdge] of pgE.entries()) {
    const neoEdge = neoE.get(key);
    if (!neoEdge) {
      missingEdges.push(pgEdge);
      continue;
    }
    if (pgEdge.propsHash !== neoEdge.propsHash) {
      mismatchedEdges.push({ key, pg: pgEdge, neo: neoEdge });
    } else {
      matchedEdges += 1;
    }
  }

  for (const [key, neoEdge] of neoE.entries()) {
    if (!pgE.has(key)) {
      extraEdges.push(neoEdge);
    }
  }

  const driftCount =
    missingNodes.length +
    extraNodes.length +
    mismatchedNodes.length +
    missingEdges.length +
    extraEdges.length +
    mismatchedEdges.length;

  const matched = matchedNodes + matchedEdges;
  const parity = matched + driftCount === 0 ? 1 : matched / (matched + driftCount);

  return {
    missingNodes,
    extraNodes,
    mismatchedNodes,
    missingEdges,
    extraEdges,
    mismatchedEdges,
    matchedNodes,
    matchedEdges,
    parity,
  };
}
