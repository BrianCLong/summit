export type SkillpackTriggers = {
  tasks?: string[];
  paths?: string[];
  keywords?: string[];
};

export type SkillpackFrontmatter = {
  name: string;
  description?: string;
  triggers?: SkillpackTriggers;
  shards?: string[];
};

export type SkillpackManifest = SkillpackFrontmatter & {
  body: string;
};

export type McpServerConfig = {
  transport?: 'stdio' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  includeTools?: string[];
  shards?: Record<string, string[]>;
};

export type SkillpackMcpConfig = {
  servers: Record<string, McpServerConfig>;
};

export type SkillpackPolicy = {
  allow?: string[];
  deny?: string[];
  environments?: Record<string, { allow?: string[]; deny?: string[] }>;
  breakGlass?: {
    required?: boolean;
    waivers?: BreakGlassWaiver[];
  };
  defaultBehavior?: 'allow' | 'deny';
};

export type BreakGlassWaiver = {
  id: string;
  toolPattern: string;
  expiresAt: string;
  issuedBy: string;
  reason: string;
};

export type TriggerContext = {
  taskType?: string;
  repoPaths?: string[];
  keywords?: string[];
};

export type ShardRoutingContext = {
  taskType?: 'plan' | 'implement' | 'review';
  governanceMode?: 'pr' | 'ci' | 'release';
  contextBudgetTokens?: number;
  repoArea?: 'frontend' | 'backend' | 'security' | 'docs' | 'other';
  intentDepthOrder?: number;
};

export type ShardSelection = {
  shard: string;
  reasons: string[];
};

export type ToolSchema = {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
};

export type DistilledToolSchema = {
  name: string;
  summary: string;
  params: string[];
  safetyNotes: string[];
  tokenEstimate: number;
  source: 'cache' | 'provided' | 'placeholder';
};

export type ToolAccessDecision = {
  toolName: string;
  allowed: boolean;
  reason: string;
  waiverId?: string;
};

export type ToolInjectionRecord = {
  toolName: string;
  serverName: string;
  mode: 'distilled' | 'full';
  tokenEstimate: number;
  decision: ToolAccessDecision;
  justification: {
    expectedUtility: string;
    tokenCost: number;
    alternatives: string[];
    planStepRef: string;
  };
};

export type ToolLoadingReport = {
  skillpack: {
    name: string;
    path: string;
  };
  shard: ShardSelection;
  context: ShardRoutingContext & {
    triggerContext?: TriggerContext;
  };
  tools: ToolInjectionRecord[];
  totals: {
    toolsConsidered: number;
    toolsInjected: number;
    estimatedTokens: number;
  };
  policy: {
    environment: string;
    breakGlassUsed: boolean;
  };
  generatedAt: string;
};
