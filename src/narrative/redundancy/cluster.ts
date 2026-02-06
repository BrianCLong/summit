import { encodeStructure } from './structure_encoder';
import { calculateStructuralSimilarity } from './similarity';
import { RedundancyCluster } from '../schema/evidence_v1';
import { createHash } from 'crypto';

interface DocInput {
  id: string;
  text: string;
}

export function findRedundancyClusters(docs: DocInput[], threshold = 0.9): RedundancyCluster[] {
  const clusters: RedundancyCluster[] = [];
  const processed = new Set<string>();

  const graphs = docs.map(d => ({ id: d.id, graph: encodeStructure(d.text) }));

  for (let i = 0; i < graphs.length; i++) {
    if (processed.has(graphs[i].id)) continue;

    const current = graphs[i];
    const clusterMembers = [current.id];
    processed.add(current.id);

    for (let j = i + 1; j < graphs.length; j++) {
      if (processed.has(graphs[j].id)) continue;

      const similarity = calculateStructuralSimilarity(current.graph, graphs[j].graph);
      if (similarity >= threshold) {
        clusterMembers.push(graphs[j].id);
        processed.add(graphs[j].id);
      }
    }

    if (clusterMembers.length > 1) {
      // Create deterministic cluster ID
      const stableInput = clusterMembers.sort().join(',');
      const clusterId = `cl:${createHash('sha256').update(stableInput).digest('hex').substring(0, 12)}`;

      clusters.push({
        cluster_id: clusterId,
        narrative_ids: clusterMembers,
        structural_fingerprint: current.graph.fingerprint, // Representative fingerprint
        size: clusterMembers.length
      });
    }
  }

  return clusters;
}
