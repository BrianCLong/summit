export interface AgentSpec {
  agent_id: string;
  runtime_profile: string;
  tool_policy: string;
}

export interface ResourceLimits {
  cpu_limit: string;
  memory_limit: string;
  max_tool_calls: number;
  max_runtime_seconds: number;
}

export interface ExecutionResult {
  status: 'success' | 'failure' | 'timeout' | 'blocked';
  output?: any;
  error?: string;
  metrics: {
    duration_ms: number;
    tool_calls: number;
  };
}

export interface ToolInvocationGate {
  validate(toolName: string, args: any): Promise<boolean>;
}

export interface SandboxManager {
  launch(limits: ResourceLimits): Promise<void>;
  executeTool(toolName: string, args: any): Promise<any>;
  cleanup(): Promise<void>;
}

export interface ExecutionAuditLogger {
  logStart(agentId: string): void;
  logToolCall(agentId: string, toolName: string, args: any): void;
  logPolicyBlock(agentId: string, toolName: string, reason: string): void;
  logFinish(agentId: string, result: ExecutionResult): void;
}

export interface AgentRuntime {
  execute(agent: AgentSpec): Promise<ExecutionResult>;
}
