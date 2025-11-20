export type TenantId = string;

export interface ToolInvocationRequest {
  id: string;
  tenantId: TenantId;
  toolName: string;
  payload: Record<string, unknown>;
}

export interface SandboxArtifact {
  name: string;
  mediaType: string;
  content: string;
}

export interface ToolExecutionResult {
  stdout?: string;
  artifacts?: SandboxArtifact[];
  logs?: string[];
}

export interface ToolMetadata {
  description: string;
  requiredSyscalls?: string[];
  networkDestinations?: string[];
  maxOutputBytes?: number;
}

export type ToolHandler = (
  request: ToolInvocationRequest,
  context: SandboxContext
) => Promise<ToolExecutionResult> | ToolExecutionResult;

export interface ToolDefinition {
  name: string;
  metadata: ToolMetadata;
  handler: ToolHandler;
}

export interface SandboxContext {
  requestSyscall: (syscall: string) => void;
  fetch: (target: string) => Promise<string>;
  createArtifact: (artifact: SandboxArtifact) => void;
  appendLog: (message: string) => void;
  getRemainingOutputBudget: () => number;
}

export interface PolicyQuotaRule {
  limit: number;
  window?: string;
}

export interface TenantPolicy {
  tenantId: TenantId;
  quotas: Map<string, PolicyQuotaRule>;
  allowAllSyscalls: boolean;
  allowedSyscalls: Set<string>;
  deniedSyscalls: Set<string>;
  allowAllNetwork: boolean;
  deniedAllNetwork: boolean;
  allowedNetworkDestinations: Set<string>;
  outputMaxBytes: number;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  policy: TenantPolicy;
}

export interface AuditEvent {
  id: string;
  type: 'request' | 'tool-execution' | 'artifact' | 'violation';
  parentId?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface SandboxRunResult {
  allowed: boolean;
  result?: ToolExecutionResult;
  decision: PolicyDecision;
}
