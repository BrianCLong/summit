export interface Node {
  id: string;
  trust: number; // 0..1
  susceptibility: number; // 0..1
  deg?: number;
}

export interface Edge {
  u: string;
  v: string;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface Intervention {
  t: number; // timestep
  type: 'publish_proof' | 'influencer_rebuttal' | 'prebunk';
  params?: Record<string, any>;
}

export interface RunResult {
  beliefCurve: number[]; // average belief per step
  peak: number;
  auc: number;
}
