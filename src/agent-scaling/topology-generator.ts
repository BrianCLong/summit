export type AgentRole = 'planner' | 'executor' | 'critic' | 'search';

export interface TopologyConfig {
  type: 'single-agent' | 'multi-agent' | 'parallel';
  roles: AgentRole[];
}

export function generateTopology(type: TopologyConfig['type']): TopologyConfig {
  switch (type) {
    case 'single-agent':
      return { type, roles: ['planner', 'executor'] };
    case 'multi-agent':
      return { type, roles: ['planner', 'critic', 'executor'] };
    case 'parallel':
      return { type, roles: ['planner', 'search'] }; // Simplification for search agents
    default:
      throw new Error(`Unknown topology type: ${type}`);
  }
}
