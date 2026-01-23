
export enum EmployeeRole {
  TRIAGE_SPECIALIST = 'triage_specialist',
  FORENSIC_ANALYST = 'forensic_analyst',
  SOC_MANAGER = 'soc_manager',
  OSINT_RESEARCHER = 'osint_researcher',
  COMPLIANCE_OFFICER = 'compliance_officer',
}

export type EmployeeScope = 'level_1' | 'level_2' | 'level_3' | 'admin';

export interface AgentCapability {
  name: string;
  description: string;
  execute: (input: any) => Promise<any>;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  role: EmployeeRole;
  scope: EmployeeScope;
  capabilities: string[]; // Names of capabilities
}

export type AgentStatus = 'idle' | 'working' | 'offline';

export interface AgentTask {
  id: string;
  type: string;
  description: string;
  payload: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected';
  assignedTo?: string;
  result?: any;
  history: Array<{ timestamp: number; action: string; actor: string }>;
}

export interface SupervisionTree {
  supervisorId: string | null;
  subordinates: string[];
}

export interface Employee extends EmployeeProfile, SupervisionTree {
  status: AgentStatus;
}
