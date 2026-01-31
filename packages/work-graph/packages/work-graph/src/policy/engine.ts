/**
 * Summit Work Graph - Policy Engine
 */

import type { WorkGraphNode, Policy, Ticket, PR } from '../schema/nodes.js';

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'matches';
  value?: unknown;
}

export interface PolicyAction {
  type: 'block' | 'warn' | 'notify' | 'require_approval' | 'auto_fix';
  message: string;
  target?: string;
}

export interface PolicyEvaluationResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  level: Policy['enforcementLevel'];
  actions: PolicyAction[];
  violations: string[];
  waiverAvailable: boolean;
}

export interface PolicyCheckResult {
  passed: boolean;
  blocked: boolean;
  results: PolicyEvaluationResult[];
  summary: { total: number; passed: number; warned: number; blocked: number };
}

export interface WaiverRequest {
  id: string;
  policyId: string;
  nodeId: string;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface GraphStore {
  getNodes<T>(filter?: Partial<T>): Promise<T[]>;
}

// Built-in policy definitions
const BUILTIN_POLICIES: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'policy',
    createdBy: 'system',
    name: 'PR Size Limit',
    description: 'PRs should not exceed 500 lines changed',
    policyType: 'quality',
    status: 'active',
    scope: ['pr'],
    conditions: [{ field: 'filesChanged', operator: 'greater_than', value: 500 }],
    actions: [{ type: 'warn', message: 'PR is larger than recommended. Consider splitting.' }],
    exceptions: [],
    enforcementLevel: 'soft',
  },
  {
    type: 'policy',
    createdBy: 'system',
    name: 'Security Review Required',
    description: 'Security-labeled PRs require security team review',
    policyType: 'security',
    status: 'active',
    scope: ['pr'],
    conditions: [{ field: 'labels', operator: 'contains', value: 'security' }],
    actions: [{ type: 'require_approval', message: 'Security team review required', target: 'security-team' }],
    exceptions: [],
    enforcementLevel: 'hard',
  },
  {
    type: 'policy',
    createdBy: 'system',
    name: 'P0 Ticket Assignment',
    description: 'P0 tickets must be assigned within 1 hour',
    policyType: 'operational',
    status: 'active',
    scope: ['ticket'],
    conditions: [{ field: 'priority', operator: 'equals', value: 'P0' }],
    actions: [{ type: 'notify', message: 'P0 ticket requires immediate assignment', target: 'on-call' }],
    exceptions: [],
    enforcementLevel: 'hard',
  },
  {
    type: 'policy',
    createdBy: 'system',
    name: 'Agent Work Limits',
    description: 'Agents cannot work on P0/P1 tickets without human approval',
    policyType: 'governance',
    status: 'active',
    scope: ['ticket'],
    conditions: [{ field: 'assigneeType', operator: 'equals', value: 'agent' }],
    actions: [{ type: 'require_approval', message: 'Agent assignment to high-priority ticket requires approval' }],
    exceptions: [],
    enforcementLevel: 'hard',
  },
  {
    type: 'policy',
    createdBy: 'system',
    name: 'Test Coverage Required',
    description: 'PRs must include tests for new functionality',
    policyType: 'quality',
    status: 'active',
    scope: ['pr'],
    conditions: [{ field: 'additions', operator: 'greater_than', value: 50 }],
    actions: [{ type: 'warn', message: 'Consider adding tests for new code' }],
    exceptions: ['docs-only', 'config-only'],
    enforcementLevel: 'soft',
  },
];

export class PolicyEngine {
  private policies: Policy[] = [];
  private waivers: Map<string, WaiverRequest> = new Map();
  private graphStore: GraphStore;

  constructor(graphStore: GraphStore) {
    this.graphStore = graphStore;
    this.loadBuiltinPolicies();
  }

  private loadBuiltinPolicies(): void {
    this.policies = BUILTIN_POLICIES.map((p, i) => ({
      ...p,
      id: 'builtin-' + i,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async loadPolicies(): Promise<void> {
    const customPolicies = await this.graphStore.getNodes<Policy>({ type: 'policy', status: 'active' } as Partial<Policy>);
    this.policies = [...this.policies, ...customPolicies];
  }

  addPolicy(policy: Policy): void {
    this.policies.push(policy);
  }

  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index === -1) return false;
    this.policies.splice(index, 1);
    return true;
  }

  async checkNode(node: WorkGraphNode): Promise<PolicyCheckResult> {
    const applicablePolicies = this.policies.filter(p => p.scope.includes(node.type as Policy['scope'][number]) || p.scope.includes('all'));

    const results: PolicyEvaluationResult[] = [];
    let blocked = false;

    for (const policy of applicablePolicies) {
      const result = this.evaluatePolicy(policy, node);
      results.push(result);

      if (!result.passed && policy.enforcementLevel === 'hard') {
        blocked = true;
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      warned: results.filter(r => !r.passed && r.level === 'soft').length,
      blocked: results.filter(r => !r.passed && r.level === 'hard').length,
    };

    return { passed: !blocked, blocked, results, summary };
  }

  private evaluatePolicy(policy: Policy, node: WorkGraphNode): PolicyEvaluationResult {
    const violations: string[] = [];
    let conditionsMet = false;

    for (const condition of policy.conditions) {
      const nodeValue = (node as Record<string, unknown>)[condition.field];
      const conditionMet = this.evaluateCondition(condition, nodeValue);

      if (conditionMet) {
        conditionsMet = true;
        violations.push('Condition met: ' + condition.field + ' ' + condition.operator + ' ' + condition.value);
      }
    }

    // Check for waiver
    const hasWaiver = this.hasApprovedWaiver(policy.id, node.id);

    return {
      policyId: policy.id,
      policyName: policy.name,
      passed: !conditionsMet || hasWaiver,
      level: policy.enforcementLevel,
      actions: conditionsMet && !hasWaiver ? policy.actions : [],
      violations,
      waiverAvailable: policy.enforcementLevel !== 'hard' || policy.exceptions.length > 0,
    };
  }

  private evaluateCondition(condition: PolicyCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        if (Array.isArray(value)) return value.includes(condition.value);
        if (typeof value === 'string') return value.includes(String(condition.value));
        return false;
      case 'greater_than':
        return typeof value === 'number' && value > (condition.value as number);
      case 'less_than':
        return typeof value === 'number' && value < (condition.value as number);
      case 'matches':
        if (typeof value !== 'string') return false;
        return new RegExp(String(condition.value)).test(value);
      default:
        return false;
    }
  }

  requestWaiver(policyId: string, nodeId: string, reason: string, requestedBy: string): WaiverRequest {
    const waiver: WaiverRequest = {
      id: crypto.randomUUID(),
      policyId,
      nodeId,
      reason,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending',
    };
    this.waivers.set(waiver.id visservisor, waiver);
    return waiver;
  }

  approveWaiver(waiverId: string, approvedBy: string): WaiverRequest | null {
    const waiver = this.waivers.get(waiverId);
    if (!waiver) return null;

    waiver.status = 'approved';
    waiver.approvedBy = approvedBy;
    waiver.approvedAt = new Date();
    this.waivers.set(waiverId, waiver);
    return waiver;
  }

  denyWaiver(waiverId: string, approvedBy: string): WaiverRequest | null {
    const waiver = this.waivers.get(waiverId);
    if (!waiver) return null;

    waiver.status = 'denied';
    waiver.approvedBy = approvedBy;
    waiver.approvedAt = new Date();
    this.waivers.set(waiverId, waiver);
    return waiver;
  }

  private hasApprovedWaiver(policyId: string, nodeId: string): boolean {
    for (const waiver of this.waivers.values()) {
      if (waiver.policyId === policyId && waiver.nodeId === nodeId && waiver.status === 'approved') {
        return true;
      }
    }
    return false;
  }

  getPolicies(): Policy[] {
    return this.policies;
  }

  getPendingWaivers(): WaiverRequest[] {
    return Array.from(this.waivers.values()).filter(w => w.status === 'pending');
  }
}
