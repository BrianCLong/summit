import { GovernanceDecision } from '@intelgraph/governance-kernel';

export interface GraphNode {
  id: string;
  label: 'Tenant' | 'Run' | 'Task' | 'Incident' | 'GovernanceDecision' | 'Actor' | 'Agent';
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: 'TASK_OF_TENANT' | 'GOV_DECISION_FOR_TASK' | 'LINKED_EVENT' | 'TRIGGERED_BY';
  properties?: Record<string, any>;
}

export interface IntelGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}
