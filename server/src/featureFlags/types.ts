// server/src/featureFlags/types.ts
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  type: 'boolean' | 'string' | 'number' | 'json' | 'variant';
  value?: any; // For non-boolean types
  variants?: Record<string, any>; // For A/B testing variants
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  rolloutPercentage?: number; // 0-100 for gradual rollout
  targetUsers?: string[]; // Specific user IDs to target
  targetGroups?: string[]; // Specific groups to target
  conditions?: FlagCondition; // Complex conditions
  scheduledChange?: ScheduledChange; // Scheduled changes to the flag
  killSwitch?: boolean; // Emergency override
  environment?: string[]; // Environments where flag is active
  tags?: string[]; // For organization and search
}

export interface FlagCondition {
  // Environment-based conditions
  env?: string[];
  
  // User attribute-based conditions
  user?: Record<string, any>;
  
  // Context-based conditions
  context?: Record<string, any>;
}

export interface ScheduledChange {
  timestamp: Date;
  newValue: boolean | any;
  description?: string;
}

export interface EvaluationContext {
  userId?: string;
  groups?: string[];
  attributes?: Record<string, any>;
  // Additional context fields can be added as needed
}