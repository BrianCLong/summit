/**
 * Core types for the AI Dev Assistant Prompt Template System
 */

export type TemplateCategory = 'core' | 'specialized' | 'meta' | 'custom';

export type TemplateType =
  | 'ui-ux-fix'
  | 'feature'
  | 'bug-fix'
  | 'refactor'
  | 'security-fix'
  | 'performance'
  | 'db-migration'
  | 'graphql-schema'
  | 'testing'
  | 'architecture'
  | 'planning'
  | 'code-review'
  | 'custom';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type Complexity = 'minimal' | 'moderate' | 'maximal';

export type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'code' | 'multiline';

export interface TemplateVariable {
  name: string;
  type: VariableType;
  description?: string;
  default?: unknown;
  required?: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
  prompt?: string;
}

export interface TemplateMetadata {
  priority?: Priority;
  estimatedTokens?: number;
  complexity?: Complexity;
  successRate?: number;
  usageCount?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  category: TemplateCategory;
  type: TemplateType;
  description?: string;
  tags?: string[];
  author?: string;
  lastUpdated?: string;
  variables?: TemplateVariable[];
  content: string;
  metadata?: TemplateMetadata;
  mixins?: string[];
  extends?: string;
  validationRules?: {
    requiredVariables?: string[];
    maxLength?: number;
    minLength?: number;
  };
}

export interface TemplateValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

export interface TemplateContext {
  [key: string]: unknown;
}

export interface GeneratedPrompt {
  template: PromptTemplate;
  content: string;
  context: TemplateContext;
  timestamp: string;
  metadata: {
    tokenEstimate: number;
    variablesUsed: string[];
  };
}

export interface PromptUsageMetric {
  templateId: string;
  timestamp: string;
  user?: string;
  context: TemplateContext;
  outcome?: 'success' | 'failure' | 'partial';
  duration?: number;
  feedback?: {
    quality: number;
    effectiveness: number;
    comments?: string;
  };
}

export interface TemplateAnalytics {
  templateId: string;
  totalUsage: number;
  successRate: number;
  avgDuration: number;
  avgQuality: number;
  avgEffectiveness: number;
  lastUsed: string;
  trendingScore: number;
}
