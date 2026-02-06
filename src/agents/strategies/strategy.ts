export type StrategyProfileName = 'autopilot' | 'swarm' | 'pipeline' | 'eco';

export type StrategyProfile = {
  name: StrategyProfileName;
  description: string;
  parallelism: 'single' | 'parallel' | 'mixed';
  autonomyLevel: 'low' | 'medium' | 'high';
  costSensitivity: 'low' | 'medium' | 'high';
};
