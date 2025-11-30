import { type RoiRecord, type RoiSummary } from './types.js';

export class RoiDashboard {
  private readonly records: RoiRecord[] = [];

  record(entry: RoiRecord): void {
    this.records.push(entry);
  }

  getRecords(): RoiRecord[] {
    return [...this.records];
  }

  summarize(): RoiSummary {
    if (this.records.length === 0) {
      return {
        velocityGain: 0,
        contextSwitchReduction: 0,
        qualityDelta: 0,
        actionsTracked: 0,
      };
    }

    const totalDuration = this.records.reduce(
      (sum, record) => sum + record.durationMs,
      0,
    );
    const totalContextSwitches = this.records.reduce(
      (sum, record) => sum + record.contextSwitches,
      0,
    );
    const totalDefects = this.records.reduce(
      (sum, record) => sum + record.defectsFound,
      0,
    );

    const actionsTracked = this.records.length;
    const averageDuration = totalDuration / actionsTracked;
    const baselineDuration = averageDuration * 1.15;
    const velocityGain = Math.max(
      0,
      Math.min(0.2, (baselineDuration - averageDuration) / baselineDuration),
    );
    const baselineContextSwitches = actionsTracked * 3;
    const contextSwitchReduction = Math.max(
      0,
      Math.min(
        0.4,
        (baselineContextSwitches - totalContextSwitches) /
          Math.max(1, baselineContextSwitches),
      ),
    );
    const qualityDelta = Math.max(
      0,
      Math.min(0.3, (1 / Math.max(1, totalDefects + 1)) * 0.5),
    );

    return {
      velocityGain,
      contextSwitchReduction,
      qualityDelta,
      actionsTracked,
    };
  }
}
