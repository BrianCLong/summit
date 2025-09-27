import { EventEmitter } from "events";

export interface BehaviorEvent {
  entityId: string;
  /**
   * Raw behavior vector before transformation.
   */
  vector: number[];
  timestamp?: number;
}

export interface AnomalyDetectionResult {
  entityId: string;
  isAnomaly: boolean;
  score: number;
}

/**
 * Maps behavioral events into a continuously updated vector space.
 * Emits `update` events whenever an entity's embedding changes.
 */
export class BehavioralDnaNetwork extends EventEmitter {
  private history: Map<string, number[][]> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  constructor(private anomalyThreshold = 3) {
    super();
  }

  /**
   * Ingest a behavior event, update embeddings and perform anomaly detection.
   */
  ingest(event: BehaviorEvent): AnomalyDetectionResult {
    const normalized = this.normalize(event.vector);
    const history = this.history.get(event.entityId) ?? [];
    const anomaly = this.detectAnomaly(event.entityId, normalized, history);

    history.push(normalized);
    this.history.set(event.entityId, history);
    this.embeddings.set(event.entityId, this.mean(history));

    this.emit("update", {
      entityId: event.entityId,
      embedding: this.embeddings.get(event.entityId),
      anomaly,
    });

    return anomaly;
  }

  /**
   * Retrieve the latest embedding for an entity.
   */
  getEmbedding(entityId: string): number[] | undefined {
    return this.embeddings.get(entityId);
  }

  /**
   * Predict the next behavior vector based on recent trend.
   */
  predictNext(entityId: string): number[] | undefined {
    const history = this.history.get(entityId);
    if (!history || history.length < 2) return undefined;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const trend = last.map((v, i) => v - prev[i]);
    return last.map((v, i) => v + trend[i]);
  }

  /**
   * Normalize a raw vector.
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    if (magnitude === 0) return vector.map(() => 0);
    return vector.map((v) => v / magnitude);
  }

  private mean(vectors: number[][]): number[] {
    const length = vectors[0]?.length ?? 0;
    const sum = new Array(length).fill(0);
    vectors.forEach((vec) => {
      for (let i = 0; i < length; i++) {
        sum[i] += vec[i];
      }
    });
    return sum.map((v) => v / vectors.length);
  }

  private detectAnomaly(
    entityId: string,
    vector: number[],
    history: number[][],
  ): AnomalyDetectionResult {
    if (history.length === 0) {
      return { entityId, isAnomaly: false, score: 0 };
    }
    const meanVec = this.mean(history);
    const distance = this.distance(vector, meanVec);
    const stdDev = this.stdDev(history, meanVec);
    const isAnomaly =
      stdDev === 0 ? distance > 0 : distance > this.anomalyThreshold * stdDev;
    const score = stdDev === 0 ? distance : distance / stdDev;
    return { entityId, isAnomaly, score };
  }

  private stdDev(history: number[][], meanVec: number[]): number {
    const distances = history.map((vec) => this.distance(vec, meanVec));
    const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance =
      distances.reduce((a, b) => a + (b - avg) ** 2, 0) / distances.length;
    return Math.sqrt(variance);
  }

  private distance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
  }
}

// Legacy placeholder to maintain backward compatibility with existing tests.
export function correlateBehavioralDna(): number {
  return 0;
}
