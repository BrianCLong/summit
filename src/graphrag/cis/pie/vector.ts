import { IntegritySignal } from '../../../../connectors/cis/plugins/types';

export interface PIEVector {
  entity_id: string;
  integrity_score: number; // 0-1
  manipulation_risk: number; // 0-1
  ai_content_ratio: number; // 0-1
  signal_count: number;
}

export class PIEVectorEngine {
  // Map entity ID to accumulated signals
  private signals: Map<string, IntegritySignal[]> = new Map();

  addSignal(entityId: string, signal: IntegritySignal) {
    const list = this.signals.get(entityId) || [];
    list.push(signal);
    this.signals.set(entityId, list);
  }

  computeVector(entityId: string): PIEVector {
    const list = this.signals.get(entityId) || [];
    if (list.length === 0) {
      return {
        entity_id: entityId,
        integrity_score: 1.0, // Default assume innocent
        manipulation_risk: 0.0,
        ai_content_ratio: 0.0,
        signal_count: 0
      };
    }

    let totalAiScore = 0;
    let totalManipulated = 0;
    let totalConfidence = 0;

    for (const s of list) {
      totalAiScore += s.scores.ai_generated * s.confidence;
      totalManipulated += s.scores.manipulated * s.confidence;
      totalConfidence += s.confidence;
    }

    const avgAi = totalConfidence > 0 ? totalAiScore / totalConfidence : 0;
    const avgManipulated = totalConfidence > 0 ? totalManipulated / totalConfidence : 0;

    // Integrity score is inverse of manipulation/spoof risks
    const integrity = 1.0 - Math.max(avgAi, avgManipulated);

    return {
      entity_id: entityId,
      integrity_score: integrity,
      manipulation_risk: avgManipulated,
      ai_content_ratio: avgAi,
      signal_count: list.length
    };
  }
}
