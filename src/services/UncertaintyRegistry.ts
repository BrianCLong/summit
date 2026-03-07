import { UncertaintyRecord, UncertaintyState, Entity, UncertaintyMetrics, UncertaintyAction } from '../types/uncertainty';

export type EstimationMethod = 'logits' | 'multiAgentVote' | 'debateScore';

export class UncertaintyRegistry {
  private records: Map<string, UncertaintyRecord> = new Map();

  attachToEntity(entity: Entity, initialState: UncertaintyState): UncertaintyRecord {
    const record: UncertaintyRecord = {
      id: crypto.randomUUID(),
      entityId: entity.id,
      ...initialState,
    };
    this.records.set(entity.id, record);
    return record;
  }

  getRecord(entityId: string): UncertaintyRecord | undefined {
    return this.records.get(entityId);
  }

  estimateUncertainty(output: any, methods: EstimationMethod[]): UncertaintyMetrics {
    // In a real implementation, this would actually evaluate the output using the methods.
    // Here we provide a mock estimation.
    let epistemic = 0;
    let aleatoric = 0;
    let diverseAgentEntropy = 0;

    if (methods.includes('logits')) {
      aleatoric += 0.2; // Example
    }
    if (methods.includes('multiAgentVote')) {
      diverseAgentEntropy += 0.5; // Example
    }
    if (methods.includes('debateScore')) {
      epistemic += 0.8; // Example
    }

    // Simulate high uncertainty if the output contains a trigger word for testing
    if (typeof output === 'string' && output.includes('highRisk')) {
       epistemic = 0.9;
    }

    return {
      epistemic: Math.min(1, epistemic),
      aleatoric: Math.min(1, aleatoric),
      diverseAgentEntropy: Math.min(1, diverseAgentEntropy),
    };
  }

  evolveState(current: UncertaintyRecord, newEvidence: any): UncertaintyRecord {
    // Simulate identifying gaps
    let nextLifecycle = current.lifecycle;
    if (current.lifecycle === 'representation') nextLifecycle = 'identification';
    else if (current.lifecycle === 'identification') nextLifecycle = 'evolution';
    else if (current.lifecycle === 'evolution') nextLifecycle = 'adaptation';

    // In a real implementation we would incorporate newEvidence to update metrics
    const updatedRecord: UncertaintyRecord = {
      ...current,
      lifecycle: nextLifecycle,
      metrics: {
        ...current.metrics,
        // Mock change based on evidence
        epistemic: Math.max(0, current.metrics.epistemic - 0.1),
      },
      sensors: [
        ...current.sensors,
        {
          type: 'evidenceUpdate',
          value: newEvidence,
          confidence: 0.8,
        }
      ]
    };

    this.records.set(current.entityId, updatedRecord);
    return updatedRecord;
  }
}
