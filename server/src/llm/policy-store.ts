// @ts-nocheck
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import {
  ModelClass,
  ProviderId,
  SensitivityLevel,
  TaskType,
} from './types.js';

export interface AllowedModel {
  provider: ProviderId;
  model: string;
  class?: ModelClass;
}

export interface TaskClassPolicy {
  allowedModels: AllowedModel[];
  maxTokens?: number;
  maxRequestsPerMinute?: number;
}

export interface TaskPolicy {
  maxTokens?: number;
  maxRequestsPerMinute?: number;
  modelClasses: Partial<Record<ModelClass, TaskClassPolicy>>;
  sensitivity?: Partial<Record<SensitivityLevel, { maxTokens?: number }>>;
}

export interface TenantPolicy {
  tasks: Partial<Record<TaskType, TaskPolicy>>;
  monthlyCost: { soft: number; hard: number };
  maxRequestsPerMinute?: number;
  promptLimit?: number;
  abuse?: {
    failureThreshold?: number;
    windowSeconds?: number;
    suspiciousPatterns?: string[];
  };
}

export interface LlmPolicyDocument {
  version?: string | number;
  tenants: Record<string, TenantPolicy>;
  defaultTenant?: string;
}

const POLICY_PATH = join(process.cwd(), 'config', 'llm-policy.yaml');

export class LlmPolicyStore {
  private doc: LlmPolicyDocument;

  constructor(policyOverride?: LlmPolicyDocument) {
    if (policyOverride) {
      this.validate(policyOverride);
      this.doc = policyOverride;
      return;
    }
    const fileContents = readFileSync(POLICY_PATH, 'utf8');
    const parsed = yaml.load(fileContents) as LlmPolicyDocument;
    this.validate(parsed);
    this.doc = parsed;
  }

  getTenantPolicy(tenantId: string): TenantPolicy | undefined {
    return this.doc.tenants[tenantId] || this.doc.tenants[this.doc.defaultTenant || 'default'];
  }

  getTaskPolicy(
    tenantId: string,
    task: TaskType,
  ): { tenant: TenantPolicy; task: TaskPolicy } | null {
    const tenant = this.getTenantPolicy(tenantId);
    if (!tenant) return null;
    const taskPolicy = tenant.tasks[task];
    if (!taskPolicy) return null;
    return { tenant, task: taskPolicy };
  }

  getClassPolicy(
    tenantId: string,
    task: TaskType,
    modelClass: ModelClass,
  ): { tenant: TenantPolicy; task: TaskPolicy; classPolicy: TaskClassPolicy } | null {
    const scoped = this.getTaskPolicy(tenantId, task);
    if (!scoped) return null;
    const classPolicy = scoped.task.modelClasses[modelClass];
    if (!classPolicy) return null;
    return { tenant: scoped.tenant, task: scoped.task, classPolicy };
  }

  private validate(doc: LlmPolicyDocument) {
    if (!doc || typeof doc !== 'object') {
      throw new Error('LLM policy is missing or malformed (root object missing)');
    }
    if (!doc.tenants || Object.keys(doc.tenants).length === 0) {
      throw new Error('LLM policy must define at least one tenant');
    }
    for (const [tenantId, tenantPolicy] of Object.entries(doc.tenants)) {
      if (!tenantPolicy.monthlyCost || tenantPolicy.monthlyCost.hard === undefined) {
        throw new Error(`Tenant ${tenantId} missing monthlyCost.hard`);
      }
      if (tenantPolicy.monthlyCost.soft === undefined) {
        throw new Error(`Tenant ${tenantId} missing monthlyCost.soft`);
      }
      if (tenantPolicy.monthlyCost.soft > tenantPolicy.monthlyCost.hard) {
        throw new Error(`Tenant ${tenantId} soft cap exceeds hard cap`);
      }
      if (!tenantPolicy.tasks || Object.keys(tenantPolicy.tasks).length === 0) {
        throw new Error(`Tenant ${tenantId} must declare at least one task policy`);
      }
      for (const [taskName, taskPolicy] of Object.entries(tenantPolicy.tasks)) {
        if (!taskPolicy?.modelClasses || Object.keys(taskPolicy.modelClasses).length === 0) {
          throw new Error(`Task ${taskName} for tenant ${tenantId} must define modelClasses`);
        }
        Object.entries(taskPolicy.modelClasses).forEach(([className, classPolicy]) => {
          if (!classPolicy || !classPolicy.allowedModels || classPolicy.allowedModels.length === 0) {
            throw new Error(
              `Task ${taskName} / class ${className} for tenant ${tenantId} must allow at least one model`,
            );
          }
        });
      }
    }
  }
}
