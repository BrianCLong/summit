import { CIGSnapshot } from '../../../graphrag/cis/cig/builder';
import { PIEVector } from '../../../graphrag/cis/pie/vector';

export interface CIEState {
  risk_distribution: Record<string, number>; // narrative_id -> accumulated risk
  equilibrium_reached: boolean;
  timestamp: string;
}

export class CIESimulator {
  run(cig: CIGSnapshot, pieVectors: PIEVector[]): CIEState {
    const riskMap: Record<string, number> = {};
    const pieMap = new Map(pieVectors.map(v => [v.entity_id, v]));

    // Initialize risk from narratives
    for (const node of cig.nodes) {
      if (node.type === 'Narrative') {
        riskMap[node.id] = node.properties.risk_score || 0;
      }
    }

    // 1-Step Propagation (Simplified Equilibrium)
    // Risk propagates from Actors to Narratives (amplification) or Narratives to Channels
    // Here we simulate Actors amplifying Narratives based on their lack of integrity

    for (const edge of cig.edges) {
      if (edge.type === 'PROMOTES') {
        const actorId = edge.source;
        const narrativeId = edge.target;

        // Find actor integrity
        // Actor ID format in CIG is "actor-NAME". We need to match with PIE entity_id.
        // Assuming PIE entity_id matches the name or the full ID.
        // Let's assume PIE uses the simple name or we strip the prefix.
        const actorName = actorId.replace('actor-', '');
        const vector = pieMap.get(actorName) || pieMap.get(actorId);

        if (vector) {
           // If integrity is low, amplification is high.
           // risk += (1 - integrity) * weight
           const amplification = (1 - vector.integrity_score) * edge.weight;
           riskMap[narrativeId] = (riskMap[narrativeId] || 0) + amplification;
        }
      }
    }

    return {
      risk_distribution: riskMap,
      equilibrium_reached: true, // Single step for now
      timestamp: new Date().toISOString()
    };
  }
}
