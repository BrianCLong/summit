import { globalRegistry, type UncertaintyRegistry } from './registry.js';
import type { UncertaintyCategory, UncertaintyState } from './models.js';

export interface UncertaintySensor {
  run(entityRef: string, data: Record<string, unknown>, registry: UncertaintyRegistry): void;
}

export class DisagreementSensor implements UncertaintySensor {
  constructor(private threshold: number = 0.3) {}

  private computeSimilarity(answers: string[]): number {
    if (!answers || answers.length === 0) return 0.0;
    const uniqueAnswers = new Set(answers);
    return answers.length > 1 ? 1.0 - uniqueAnswers.size / answers.length : 1.0;
  }

  run(entityRef: string, data: Record<string, unknown>, registry: UncertaintyRegistry): void {
    const answers = data.answers as string[] | undefined;
    if (!answers || answers.length === 0) return;

    const similarity = this.computeSimilarity(answers);
    const disagreement_index = 1.0 - similarity;

    if (disagreement_index > this.threshold) {
      const records = registry.findByEntity(entityRef);
      if (records.length > 0) {
        for (const record of records) {
          registry.updateRecord(
            record.id,
            { disagreement_index },
            'Characterized' as UncertaintyState,
          );
        }
      } else {
        registry.createRecord(
          entityRef,
          { disagreement_index },
          { category: 'model-disagreement' as UncertaintyCategory },
        );
      }
    }
  }
}

export class EvidenceSparsitySensor implements UncertaintySensor {
  constructor(private threshold: number = 0.5) {}

  run(entityRef: string, data: Record<string, unknown>, registry: UncertaintyRegistry): void {
    const supportingEvidence = (data.supporting_evidence as unknown[]) || [];
    const requiredEvidence = (data.required_evidence as number) || 1;

    const evidence_coverage =
      requiredEvidence <= 0 ? 1.0 : Math.min(1.0, supportingEvidence.length / requiredEvidence);

    if (evidence_coverage < this.threshold) {
      const records = registry.findByEntity(entityRef);
      if (records.length > 0) {
        for (const record of records) {
          registry.updateRecord(
            record.id,
            { evidence_coverage },
            'Characterized' as UncertaintyState,
          );
        }
      } else {
        registry.createRecord(
          entityRef,
          { evidence_coverage },
          { category: 'data-quality' as UncertaintyCategory },
        );
      }
    }
  }
}

export class DiverseAgentEntropySensor implements UncertaintySensor {
  constructor(private threshold: number = 0.6) {}

  private computeEntropy(probabilities: number[]): number {
    let entropy = 0.0;
    for (const p of probabilities) {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    const maxEntropy = probabilities.length > 1 ? Math.log2(probabilities.length) : 1.0;
    return maxEntropy > 0 ? entropy / maxEntropy : 0.0;
  }

  run(entityRef: string, data: Record<string, unknown>, registry: UncertaintyRegistry): void {
    const probabilities = data.probabilities as number[] | undefined;
    if (!probabilities || probabilities.length === 0) return;

    const epistemic_score = this.computeEntropy(probabilities);

    if (epistemic_score > this.threshold) {
      const records = registry.findByEntity(entityRef);
      if (records.length > 0) {
        for (const record of records) {
          registry.updateRecord(
            record.id,
            { epistemic_score },
            'Characterized' as UncertaintyState,
          );
        }
      } else {
        registry.createRecord(
          entityRef,
          { epistemic_score },
          { category: 'model-knowledge' as UncertaintyCategory },
        );
      }
    }
  }
}

export class UncertaintySensorRunner {
  private sensors: UncertaintySensor[];

  constructor(sensors?: UncertaintySensor[]) {
    this.sensors = sensors || [
      new DisagreementSensor(),
      new EvidenceSparsitySensor(),
      new DiverseAgentEntropySensor(),
    ];
  }

  addSensor(sensor: UncertaintySensor): void {
    this.sensors.push(sensor);
  }

  runAll(entityRef: string, data: Record<string, unknown>, registry: UncertaintyRegistry = globalRegistry): void {
    for (const sensor of this.sensors) {
      try {
        sensor.run(entityRef, data, registry);
      } catch (e) {
        console.error(`Sensor failed:`, e);
      }
    }
  }
}
