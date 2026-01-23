import type { WorkGraphNode, Policy, Ticket, PR } from '../schema/nodes.js';

export interface PolicyCondition { field: string; operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'matches'; value?: unknown; }
export interface PolicyAction { type: 'block' | 'warn' | 'notify' | 'require_approval' | 'auto_fix'; message: string; target?: string; }
export interface PolicyEvaluationResult { policyId: string; policyName: string; passed: boolean; level: Policy['enforcementLevel']; actions: PolicyAction[]; violations: string[]; waiverAvailable: boolean; }
export interface PolicyCheckResult { passed: boolean; blocked: boolean; results: PolicyEvaluationResult[]; summary: { total: number; passed: number; warned: number; blocked: number }; }
export interface WaiverRequest { id: string; policyId: string; nodeId: string; reason: string; requestedBy: string; requestedAt: Date; status: 'pending' | 'approved' | 'denied'; approvedBy?: string; approvedAt?: Date; }
export interface GraphStore { getNodes<T>(filter?: Partial<T>): Promise<T[]>; }

const BUILTIN_POLICIES: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { type: 'policy', createdBy: 'system', name: 'PR Size Limit', description: 'PRs should not exceed 500 lines', policyType: 'quality', status: 'active', scope: ['pr'], conditions: [{ field: 'filesChanged', operator: 'greater_than', value: 500 }], actions: [{ type: 'warn', message: 'PR is large' }], exceptions: [], enforcementLevel: 'soft' },
  { type: 'policy', createdBy: 'system', name: 'Security Review', description: 'Security PRs need review', policyType: 'security', status: 'active', scope: ['pr'], conditions: [{ field: 'labels', operator: 'contains', value: 'security' }], actions: [{ type: 'require_approval', message: 'Security review required' }], exceptions: [], enforcementLevel: 'hard' },
  { type: 'policy', createdBy: 'system', name: 'Agent Limits', description: 'Agents cannot do P0/P1', policyType: 'governance', status: 'active', scope: ['ticket'], conditions: [{ field: 'assigneeType', operator: 'equals', value: 'agent' }], actions: [{ type: 'require_approval', message: 'Approval needed' }], exceptions: [], enforcementLevel: 'hard' },
];

export class PolicyEngine {
  private policies: Policy[] = [];
  private waivers: Map<string, WaiverRequest> = new Map();

  constructor(private graphStore: GraphStore) { this.loadBuiltinPolicies(); }

  private loadBuiltinPolicies(): void { this.policies = BUILTIN_POLICIES.map((p, i) => ({ ...p, id: 'builtin-' + i, createdAt: new Date(), updatedAt: new Date() })); }

  async loadPolicies(): Promise<void> {
    const custom = await this.graphStore.getNodes<Policy>({ type: 'policy', status: 'active' } as Partial<Policy>);
    this.policies = [...this.policies, ...custom];
  }

  addPolicy(policy: Policy): void { this.policies.push(policy); }
  removePolicy(id: string): boolean { const idx = this.policies.findIndex(p => p.id === id); if (idx === -1) return false; this.policies.splice(idx, 1); return true; }

  async checkNode(node: WorkGraphNode): Promise<PolicyCheckResult> {
    const applicable = this.policies.filter(p => p.scope.includes(node.type as Policy['scope'][number]) || p.scope.includes('all'));
    const results: PolicyEvaluationResult[] = [];
    let blocked = false;
    for (const policy of applicable) {
      const result = this.evaluatePolicy(policy, node);
      results.push(result);
      if (!result.passed && policy.enforcementLevel === 'hard') blocked = true;
    }
    return { passed: !blocked, blocked, results, summary: { total: results.length, passed: results.filter(r => r.passed).length, warned: results.filter(r => !r.passed && r.level === 'soft').length, blocked: results.filter(r => !r.passed && r.level === 'hard').length } };
  }

  private evaluatePolicy(policy: Policy, node: WorkGraphNode): PolicyEvaluationResult {
    const violations: string[] = [];
    let met = false;
    for (const c of policy.conditions) {
      const v = (node as Record<string, unknown>)[c.field];
      if (this.evalCondition(c, v)) { met = true; violations.push(c.field + ' ' + c.operator + ' ' + c.value); }
    }
    const hasWaiver = this.hasApprovedWaiver(policy.id, node.id);
    return { policyId: policy.id, policyName: policy.name, passed: !met || hasWaiver, level: policy.enforcementLevel, actions: met && !hasWaiver ? policy.actions : [], violations, waiverAvailable: policy.enforcementLevel !== 'hard' };
  }

  private evalCondition(c: PolicyCondition, v: unknown): boolean {
    if (c.operator === 'equals') return v === c.value;
    if (c.operator === 'not_equals') return v !== c.value;
    if (c.operator === 'contains') return Array.isArray(v) ? v.includes(c.value) : typeof v === 'string' && v.includes(String(c.value));
    if (c.operator === 'greater_than') return typeof v === 'number' && v > (c.value as number);
    if (c.operator === 'less_than') return typeof v === 'number' && v < (c.value as number);
    if (c.operator === 'matches') return typeof v === 'string' && new RegExp(String(c.value)).test(v);
    return false;
  }

  requestWaiver(policyId: string, nodeId: string, reason: string, requestedBy: string): WaiverRequest {
    const w: WaiverRequest = { id: crypto.randomUUID(), policyId, nodeId, reason, requestedBy, requestedAt: new Date(), status: 'pending' };
    this.waivers.set(w.id, w);
    return w;
  }

  approveWaiver(waiverId: string, approvedBy: string): WaiverRequest | null {
    const w = this.waivers.get(waiverId);
    if (!w) return null;
    w.status = 'approved'; w.approvedBy = approvedBy; w.approvedAt = new Date();
    return w;
  }

  denyWaiver(waiverId: string, approvedBy: string): WaiverRequest | null {
    const w = this.waivers.get(waiverId);
    if (!w) return null;
    w.status = 'denied'; w.approvedBy = approvedBy; w.approvedAt = new Date();
    return w;
  }

  private hasApprovedWaiver(policyId: string, nodeId: string): boolean {
    for (const w of this.waivers.values()) if (w.policyId === policyId && w.nodeId === nodeId && w.status === 'approved') return true;
    return false;
  }

  getPolicies(): Policy[] { return this.policies; }
  getPendingWaivers(): WaiverRequest[] { return Array.from(this.waivers.values()).filter(w => w.status === 'pending'); }
}
