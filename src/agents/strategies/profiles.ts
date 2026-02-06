import { STRATEGY_PROFILES_ENABLED } from './flags';
import { StrategyProfile, StrategyProfileName } from './strategy';

const PROFILES: Record<StrategyProfileName, StrategyProfile> = {
  autopilot: {
    name: 'autopilot',
    description: 'High autonomy with gated approvals and policy checks.',
    parallelism: 'mixed',
    autonomyLevel: 'high',
    costSensitivity: 'medium',
  },
  swarm: {
    name: 'swarm',
    description: 'Parallel task execution with independent subagents.',
    parallelism: 'parallel',
    autonomyLevel: 'medium',
    costSensitivity: 'medium',
  },
  pipeline: {
    name: 'pipeline',
    description: 'Sequential stages with strict ordering and handoffs.',
    parallelism: 'single',
    autonomyLevel: 'low',
    costSensitivity: 'medium',
  },
  eco: {
    name: 'eco',
    description: 'Cost-conscious routing with conservative execution.',
    parallelism: 'single',
    autonomyLevel: 'low',
    costSensitivity: 'high',
  },
};

export const getStrategyProfile = (
  name: StrategyProfileName,
): StrategyProfile => {
  if (!STRATEGY_PROFILES_ENABLED) {
    throw new Error('STRATEGY_PROFILES_ENABLED is false');
  }
  return PROFILES[name];
};

export const listStrategyProfiles = (): StrategyProfile[] => {
  if (!STRATEGY_PROFILES_ENABLED) {
    return [];
  }
  return Object.values(PROFILES);
};
