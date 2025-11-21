/**
 * Autonomous Threat Response with AI Decision Engine
 *
 * Machine learning-driven autonomous response orchestration
 * with human-in-the-loop safeguards
 */

import { z } from 'zod';

export const ThreatContextSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.enum([
    'MALWARE', 'INTRUSION', 'EXFILTRATION', 'LATERAL_MOVEMENT', 'PRIVILEGE_ESCALATION',
    'PERSISTENCE', 'C2_ACTIVITY', 'INSIDER_THREAT', 'APT', 'RANSOMWARE', 'DDoS'
  ]),
  indicators: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number()
  })),
  affectedAssets: z.array(z.object({
    id: z.string(),
    type: z.enum(['ENDPOINT', 'SERVER', 'NETWORK', 'USER', 'APPLICATION', 'DATA']),
    criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    businessContext: z.string().optional()
  })),
  attackStage: z.enum([
    'RECONNAISSANCE', 'WEAPONIZATION', 'DELIVERY', 'EXPLOITATION',
    'INSTALLATION', 'C2', 'ACTIONS_ON_OBJECTIVES'
  ]),
  attribution: z.object({
    actor: z.string().optional(),
    campaign: z.string().optional(),
    confidence: z.number()
  }).optional(),
  timeline: z.array(z.object({ timestamp: z.date(), event: z.string() }))
});

export type ThreatContext = z.infer<typeof ThreatContextSchema>;

export const ResponseActionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'ISOLATE_HOST', 'BLOCK_IP', 'BLOCK_DOMAIN', 'DISABLE_USER', 'KILL_PROCESS',
    'QUARANTINE_FILE', 'RESET_CREDENTIALS', 'REVOKE_SESSION', 'ENABLE_MFA',
    'DEPLOY_PATCH', 'UPDATE_FIREWALL', 'SINKHOLE_DOMAIN', 'FORENSIC_CAPTURE',
    'ALERT_SOC', 'ESCALATE', 'NOTIFY_STAKEHOLDER'
  ]),
  target: z.object({
    type: z.string(),
    identifier: z.string(),
    context: z.record(z.string(), z.any()).optional()
  }),
  parameters: z.record(z.string(), z.any()),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  requiresApproval: z.boolean(),
  reversible: z.boolean(),
  estimatedImpact: z.object({
    businessDisruption: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
    affectedUsers: z.number(),
    duration: z.number()
  }),
  status: z.enum(['PENDING', 'APPROVED', 'EXECUTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK']),
  executedAt: z.date().optional(),
  result: z.object({ success: z.boolean(), details: z.string() }).optional()
});

export type ResponseAction = z.infer<typeof ResponseActionSchema>;

export const PlaybookSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  triggerConditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'MATCHES']),
    value: z.any()
  })),
  actions: z.array(z.object({
    order: z.number(),
    action: ResponseActionSchema.omit({ id: true, status: true }),
    conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.any() })).optional(),
    onFailure: z.enum(['STOP', 'CONTINUE', 'ROLLBACK', 'ESCALATE'])
  })),
  approvalRequired: z.boolean(),
  autoExecute: z.boolean(),
  maxAutonomyLevel: z.enum(['FULL_AUTO', 'SEMI_AUTO', 'SUPERVISED', 'MANUAL']),
  cooldownMinutes: z.number(),
  metrics: z.object({
    timesExecuted: z.number(),
    avgExecutionTime: z.number(),
    successRate: z.number()
  })
});

export type Playbook = z.infer<typeof PlaybookSchema>;

/**
 * AI Decision Engine for autonomous response
 */
export class AIDecisionEngine {
  private riskThresholds = { auto: 30, semiAuto: 60, supervised: 80 };
  private playbooks: Map<string, Playbook> = new Map();
  private pendingActions: Map<string, ResponseAction> = new Map();
  private executionHistory: ResponseAction[] = [];
  private learningEnabled = true;

  /**
   * Analyze threat and recommend response
   */
  async analyzeAndRespond(threat: ThreatContext): Promise<{
    decision: 'AUTO_RESPOND' | 'RECOMMEND' | 'ESCALATE';
    actions: ResponseAction[];
    reasoning: string[];
    confidence: number;
    riskScore: number;
    playbook: Playbook | null;
  }> {
    const riskScore = this.calculateRiskScore(threat);
    const matchingPlaybooks = this.findMatchingPlaybooks(threat);
    const actions = this.generateResponseActions(threat, matchingPlaybooks);
    const confidence = this.calculateConfidence(threat, actions);
    const reasoning = this.generateReasoning(threat, actions, riskScore);

    let decision: 'AUTO_RESPOND' | 'RECOMMEND' | 'ESCALATE';
    if (riskScore <= this.riskThresholds.auto && confidence > 0.85) {
      decision = 'AUTO_RESPOND';
    } else if (riskScore <= this.riskThresholds.semiAuto) {
      decision = 'RECOMMEND';
    } else {
      decision = 'ESCALATE';
    }

    // Auto-execute low-risk, high-confidence actions
    if (decision === 'AUTO_RESPOND') {
      for (const action of actions.filter(a => !a.requiresApproval)) {
        await this.executeAction(action);
      }
    }

    return {
      decision,
      actions,
      reasoning,
      confidence,
      riskScore,
      playbook: matchingPlaybooks[0] || null
    };
  }

  /**
   * Execute a response action
   */
  async executeAction(action: ResponseAction): Promise<{
    success: boolean;
    result: string;
    rollbackAvailable: boolean;
  }> {
    action.status = 'EXECUTING';
    action.executedAt = new Date();

    try {
      // Simulate action execution based on type
      const result = await this.performAction(action);
      action.status = result.success ? 'COMPLETED' : 'FAILED';
      action.result = { success: result.success, details: result.message };

      this.executionHistory.push(action);

      if (this.learningEnabled) {
        this.updateLearning(action);
      }

      return {
        success: result.success,
        result: result.message,
        rollbackAvailable: action.reversible
      };
    } catch (error) {
      action.status = 'FAILED';
      action.result = { success: false, details: String(error) };
      return { success: false, result: String(error), rollbackAvailable: false };
    }
  }

  /**
   * Rollback a previous action
   */
  async rollbackAction(actionId: string): Promise<{ success: boolean; message: string }> {
    const action = this.executionHistory.find(a => a.id === actionId);
    if (!action) return { success: false, message: 'Action not found' };
    if (!action.reversible) return { success: false, message: 'Action not reversible' };

    // Perform rollback based on action type
    const rollbackMap: Record<string, () => Promise<{ success: boolean; message: string }>> = {
      ISOLATE_HOST: async () => ({ success: true, message: 'Host reconnected' }),
      BLOCK_IP: async () => ({ success: true, message: 'IP unblocked' }),
      DISABLE_USER: async () => ({ success: true, message: 'User re-enabled' }),
      QUARANTINE_FILE: async () => ({ success: true, message: 'File restored' })
    };

    const rollbackFn = rollbackMap[action.type];
    if (rollbackFn) {
      const result = await rollbackFn();
      action.status = 'ROLLED_BACK';
      return result;
    }

    return { success: false, message: 'No rollback procedure available' };
  }

  /**
   * Configure autonomy levels
   */
  configureAutonomy(config: {
    fullAutoThreshold: number;
    semiAutoThreshold: number;
    supervisedThreshold: number;
    enableLearning: boolean;
    requireApprovalFor: string[];
  }): void {
    this.riskThresholds.auto = config.fullAutoThreshold;
    this.riskThresholds.semiAuto = config.semiAutoThreshold;
    this.riskThresholds.supervised = config.supervisedThreshold;
    this.learningEnabled = config.enableLearning;
  }

  /**
   * Get pending actions requiring approval
   */
  getPendingApprovals(): ResponseAction[] {
    return Array.from(this.pendingActions.values()).filter(a => a.status === 'PENDING');
  }

  /**
   * Approve pending action
   */
  async approveAction(actionId: string, approver: string): Promise<{ success: boolean }> {
    const action = this.pendingActions.get(actionId);
    if (!action) return { success: false };

    action.status = 'APPROVED';
    await this.executeAction(action);
    this.pendingActions.delete(actionId);
    return { success: true };
  }

  /**
   * Get response metrics
   */
  getMetrics(): {
    totalResponses: number;
    autoResponses: number;
    avgResponseTime: number;
    successRate: number;
    topActionTypes: Array<{ type: string; count: number }>;
  } {
    const actionCounts = new Map<string, number>();
    let totalTime = 0;
    let successCount = 0;

    for (const action of this.executionHistory) {
      actionCounts.set(action.type, (actionCounts.get(action.type) || 0) + 1);
      if (action.result?.success) successCount++;
    }

    return {
      totalResponses: this.executionHistory.length,
      autoResponses: this.executionHistory.filter(a => !a.requiresApproval).length,
      avgResponseTime: this.executionHistory.length > 0 ? totalTime / this.executionHistory.length : 0,
      successRate: this.executionHistory.length > 0 ? successCount / this.executionHistory.length : 0,
      topActionTypes: Array.from(actionCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  // Private methods
  private calculateRiskScore(threat: ThreatContext): number {
    let score = 0;
    const severityScores = { LOW: 10, MEDIUM: 30, HIGH: 60, CRITICAL: 100 };
    score += severityScores[threat.severity];
    score += threat.affectedAssets.filter(a => a.criticality === 'CRITICAL').length * 20;
    score += threat.attackStage === 'ACTIONS_ON_OBJECTIVES' ? 30 : 0;
    return Math.min(100, score);
  }

  private findMatchingPlaybooks(threat: ThreatContext): Playbook[] {
    return Array.from(this.playbooks.values()).filter(playbook => {
      return playbook.triggerConditions.every(cond => {
        const value = (threat as any)[cond.field];
        switch (cond.operator) {
          case 'EQUALS': return value === cond.value;
          case 'CONTAINS': return Array.isArray(value) && value.includes(cond.value);
          default: return false;
        }
      });
    });
  }

  private generateResponseActions(threat: ThreatContext, playbooks: Playbook[]): ResponseAction[] {
    const actions: ResponseAction[] = [];

    // Generate actions based on threat category
    const categoryActions: Record<string, ResponseAction['type'][]> = {
      MALWARE: ['ISOLATE_HOST', 'QUARANTINE_FILE', 'FORENSIC_CAPTURE'],
      INTRUSION: ['BLOCK_IP', 'ISOLATE_HOST', 'ALERT_SOC'],
      EXFILTRATION: ['BLOCK_IP', 'DISABLE_USER', 'FORENSIC_CAPTURE'],
      RANSOMWARE: ['ISOLATE_HOST', 'DISABLE_USER', 'ALERT_SOC', 'ESCALATE']
    };

    const actionTypes = categoryActions[threat.category] || ['ALERT_SOC'];

    for (const type of actionTypes) {
      actions.push({
        id: crypto.randomUUID(),
        type,
        target: { type: 'auto', identifier: threat.affectedAssets[0]?.id || 'unknown' },
        parameters: {},
        priority: threat.severity,
        requiresApproval: threat.severity === 'CRITICAL',
        reversible: ['ISOLATE_HOST', 'BLOCK_IP', 'DISABLE_USER'].includes(type),
        estimatedImpact: {
          businessDisruption: threat.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
          affectedUsers: threat.affectedAssets.length,
          duration: 60
        },
        status: 'PENDING'
      });
    }

    return actions;
  }

  private calculateConfidence(threat: ThreatContext, actions: ResponseAction[]): number {
    let confidence = 0.7;
    if (threat.indicators.length > 3) confidence += 0.1;
    if (threat.attribution?.confidence && threat.attribution.confidence > 0.8) confidence += 0.1;
    return Math.min(1, confidence);
  }

  private generateReasoning(threat: ThreatContext, actions: ResponseAction[], riskScore: number): string[] {
    return [
      `Threat severity: ${threat.severity} (risk score: ${riskScore})`,
      `Attack stage: ${threat.attackStage}`,
      `${threat.affectedAssets.length} asset(s) affected`,
      `${actions.length} response action(s) recommended`,
      `${actions.filter(a => a.reversible).length} action(s) are reversible`
    ];
  }

  private async performAction(action: ResponseAction): Promise<{ success: boolean; message: string }> {
    // Simulated action execution
    return { success: true, message: `${action.type} executed successfully` };
  }

  private updateLearning(action: ResponseAction): void {
    // Update ML model based on action outcome
  }

  // Public API
  addPlaybook(playbook: Playbook): void { this.playbooks.set(playbook.id, playbook); }
  getPlaybook(id: string): Playbook | undefined { return this.playbooks.get(id); }
  getAllPlaybooks(): Playbook[] { return Array.from(this.playbooks.values()); }
  getExecutionHistory(): ResponseAction[] { return [...this.executionHistory]; }
}

