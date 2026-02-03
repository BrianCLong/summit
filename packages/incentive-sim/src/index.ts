export interface IncentiveModel {
  type: string;
  parameters: Record<string, any>;
  calculateReward: (metrics: Record<string, number>) => number;
}

export const OnCallCompensationModel: IncentiveModel = {
  type: 'on_call_compensation',
  parameters: {
    base_rate: 100, // $ per week
    incident_rate: 50, // $ per incident
    severity_multiplier: 1.5
  },
  calculateReward: (metrics: Record<string, number>) => {
    // metrics: { incidents: number, total_severity: number }
    const base = 100;
    const variable = (metrics.incidents || 0) * 50;
    const severityBonus = (metrics.total_severity || 0) * 20;

    return base + variable + severityBonus;
  }
};

export const SprintVelocityBonusModel: IncentiveModel = {
  type: 'sprint_velocity',
  parameters: {
    target_velocity: 50,
    bonus_per_point: 10
  },
  calculateReward: (metrics: Record<string, number>) => {
    // metrics: { velocity: number }
    const velocity = metrics.velocity || 0;
    if (velocity > 50) {
        return (velocity - 50) * 10;
    }
    return 0;
  }
};

export function simulateIncentive(model: IncentiveModel, metrics: Record<string, number>): number {
    console.log(`Simulating ${model.type} with metrics:`, metrics);
    return model.calculateReward(metrics);
}
