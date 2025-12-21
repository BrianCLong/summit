import { v4 as uuid } from 'uuid';

export type ExperimentExposure = {
  exposureId: string;
  workspaceId: string;
  flag: string;
  experimentId: string;
  variant: 'control' | 'treatment';
  timestamp: Date;
};

export class ExperimentExposureService {
  private flagToExperiment: Record<string, string> = {
    'activation.guidedSetup': 'exp-guided-setup-1',
    'activation.checklists': 'exp-checklist-1',
    'activation.valuePrompt': 'exp-upgrade-1',
  };

  private exposures: ExperimentExposure[] = [];
  private exposureIndex = new Set<string>();

  logExposure(workspaceId: string, flag: string): ExperimentExposure {
    const experimentId = this.flagToExperiment[flag];
    if (!experimentId) {
      throw new Error(`Flag ${flag} is not mapped to an experiment`);
    }
    const key = `${workspaceId}:${flag}`;
    if (this.exposureIndex.has(key)) {
      return this.exposures.find((e) => e.workspaceId === workspaceId && e.flag === flag)!;
    }
    const exposure: ExperimentExposure = {
      exposureId: uuid(),
      workspaceId,
      flag,
      experimentId,
      variant: Math.random() > 0.5 ? 'treatment' : 'control',
      timestamp: new Date(),
    };
    this.exposures.push(exposure);
    this.exposureIndex.add(key);
    return exposure;
  }

  getExposures(): ExperimentExposure[] {
    return [...this.exposures];
  }
}
