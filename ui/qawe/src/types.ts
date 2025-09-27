
export type StageKind = 'sequential' | 'parallel' | 'conditional';

export interface GateDefinition {
  id: string;
  role: string;
  quorum: number;
  expirySeconds: number;
  allowDelegates?: boolean;
}

export interface BranchDefinition {
  condition: {
    field: string;
    equals: string;
  };
  next: string[];
}

export interface StageDefinition {
  id: string;
  kind: StageKind;
  gates?: GateDefinition[];
  branches?: BranchDefinition[];
  next?: string[];
}

export interface Delegate {
  id: string;
  display: string;
  publicKey: string;
}

export interface Principal {
  id: string;
  display: string;
  publicKey: string;
  delegates?: Delegate[];
}

export interface RolePolicy {
  id: string;
  name: string;
  principals: Principal[];
}

export interface Policy {
  roles: Record<string, RolePolicy>;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  start: string;
  stages: StageDefinition[];
  policy: Policy;
}

export interface ApprovalRecord {
  principalId: string;
  actorId: string;
  delegatedFrom?: string;
  payload: string;
  signature: string;
  signedAt: string;
}

export interface ApprovalBundle {
  instanceId: string;
  workflowId: string;
  stageId: string;
  gateId: string;
  quorum: number;
  approvals: ApprovalRecord[];
  issuedAt: string;
  serverSignature: string;
  serverPublicKey: string;
}

export type InstanceStatus = 'pending' | 'active' | 'completed' | 'expired';

export interface GateRuntime {
  definition: GateDefinition;
  approvals: ApprovalRecord[];
  satisfied: boolean;
  expiresAt?: string;
  bundle?: ApprovalBundle;
}

export interface StageRuntime {
  definition: StageDefinition;
  gates: Record<string, GateRuntime>;
  activeGate?: string;
  startedAt: string;
}

export interface StageResult {
  stageId: string;
  status: 'completed' | 'expired';
  completedAt: string;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  context: Record<string, string>;
  status: InstanceStatus;
  activeStages: Record<string, StageRuntime>;
  completedStages: Record<string, StageResult>;
  approvalBundles: ApprovalBundle[];
  createdAt: string;
  updatedAt: string;
}

export interface ServerInfo {
  serverPublicKey: string;
}
