export interface AgentConfig {
  name: string;
  role: 'PRReviewer' | 'LeakHunter' | 'GovEnforcer' | 'FactoryAgent';
  tenantId: string;
  capabilities: string[];
  securityLevel: 'standard' | 'quantum-secure';
}

export interface AgentIdentity {
  id: string;
  publicKey: string;
  certificate: string; // PEM format
  expiry: Date;
  quantumSafe: boolean;
}

export interface ROIMetrics {
  velocityGain: number; // Percentage
  contextSwitchesReduced: number; // Percentage
  complianceScore: number; // 0-100
  tasksCompleted: number;
  uptime: number;
}

export interface FactoryStatus {
  activeAgents: number;
  factories: number;
  totalMetrics: ROIMetrics;
  lastQuantumScan: Date;
}
