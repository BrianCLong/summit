import { DriftDetector, DriftSignal } from './types.js';
import {
  ModelDriftDetector,
  AgentDriftDetector,
  RiskDriftDetector,
  CostDriftDetector,
} from './detectors.js';

export class DriftGovernanceService {
  private detectors: DriftDetector[];

  constructor() {
    this.detectors = [
      new ModelDriftDetector(),
      new AgentDriftDetector(),
      new RiskDriftDetector(),
      new CostDriftDetector(),
    ];
  }

  async collectDriftSignals(): Promise<DriftSignal[]> {
    const allSignals: DriftSignal[] = [];
    for (const detector of this.detectors) {
      const signals = await detector.detect();
      allSignals.push(...signals);
    }
    return allSignals;
  }
}
