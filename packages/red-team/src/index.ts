/**
 * Red Team Exercise Framework
 *
 * Comprehensive adversary emulation, penetration testing coordination,
 * and security exercise management
 */

import { z } from 'zod';

// Exercise Types
export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  classification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
  type: z.enum([
    'RED_TEAM',
    'PURPLE_TEAM',
    'PENETRATION_TEST',
    'ADVERSARY_EMULATION',
    'TABLETOP',
    'FULL_SCALE'
  ]),
  status: z.enum(['PLANNING', 'APPROVED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  objectives: z.array(z.string()),
  scope: z.object({
    inScope: z.array(z.string()),
    outOfScope: z.array(z.string()),
    rules: z.array(z.string())
  }),
  timeline: z.object({
    plannedStart: z.date(),
    plannedEnd: z.date(),
    actualStart: z.date().optional(),
    actualEnd: z.date().optional()
  }),
  team: z.object({
    redTeam: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string()
    })),
    blueTeam: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string()
    })),
    whiteTeam: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string()
    }))
  }),
  emulatedActor: z.string().optional(),
  ttpsUsed: z.array(z.string()),
  findings: z.array(z.object({
    id: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
    title: z.string(),
    description: z.string(),
    evidence: z.array(z.string()),
    recommendation: z.string(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'REMEDIATED', 'ACCEPTED'])
  })),
  metrics: z.object({
    objectivesAchieved: z.number(),
    detectionRate: z.number(),
    meanTimeToDetect: z.number(),
    meanTimeToRespond: z.number(),
    criticalFindingsCount: z.number()
  }).optional()
});

export type Exercise = z.infer<typeof ExerciseSchema>;

// Adversary Emulation Plan
export const EmulationPlanSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string(),
  emulatedActor: z.string(),
  phases: z.array(z.object({
    phase: z.number(),
    name: z.string(),
    objective: z.string(),
    techniques: z.array(z.object({
      mitreId: z.string(),
      name: z.string(),
      procedure: z.string(),
      tools: z.array(z.string()),
      expectedDetection: z.boolean()
    })),
    successCriteria: z.array(z.string()),
    abortCriteria: z.array(z.string())
  })),
  infrastructure: z.object({
    c2Servers: z.array(z.string()),
    redirectors: z.array(z.string()),
    payloadHosts: z.array(z.string()),
    exfilEndpoints: z.array(z.string())
  }),
  payloads: z.array(z.object({
    name: z.string(),
    type: z.string(),
    hash: z.string(),
    capabilities: z.array(z.string())
  }))
});

export type EmulationPlan = z.infer<typeof EmulationPlanSchema>;

// Attack Chain
export const AttackChainSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string(),
  timestamp: z.date(),
  phase: z.string(),
  technique: z.string(),
  target: z.string(),
  action: z.string(),
  result: z.enum(['SUCCESS', 'FAILURE', 'DETECTED', 'BLOCKED']),
  detectionDetails: z.object({
    detected: z.boolean(),
    detectionTime: z.date().optional(),
    detectionSource: z.string().optional(),
    alertId: z.string().optional()
  }),
  artifacts: z.array(z.object({
    type: z.string(),
    value: z.string(),
    description: z.string()
  })),
  notes: z.string().optional()
});

export type AttackChain = z.infer<typeof AttackChainSchema>;

/**
 * Red Team Exercise Manager
 */
export class RedTeamManager {
  private exercises: Map<string, Exercise> = new Map();
  private emulationPlans: Map<string, EmulationPlan> = new Map();
  private attackChains: Map<string, AttackChain[]> = new Map();

  /**
   * Create new red team exercise
   */
  createExercise(data: Omit<Exercise, 'id' | 'status' | 'findings' | 'metrics'>): Exercise {
    const exercise: Exercise = {
      ...data,
      id: crypto.randomUUID(),
      status: 'PLANNING',
      findings: [],
      metrics: undefined
    };

    this.exercises.set(exercise.id, exercise);
    return exercise;
  }

  /**
   * Generate adversary emulation plan based on threat actor
   */
  async generateEmulationPlan(
    exerciseId: string,
    actorProfile: any,
    targetEnvironment: any
  ): Promise<EmulationPlan> {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) {
      throw new Error(`Exercise ${exerciseId} not found`);
    }

    // Map actor TTPs to emulation procedures
    const phases = this.mapActorTTPs(actorProfile, targetEnvironment);

    // Generate infrastructure requirements
    const infrastructure = this.planInfrastructure(phases);

    // Generate payload requirements
    const payloads = this.planPayloads(phases, actorProfile);

    const plan: EmulationPlan = {
      id: crypto.randomUUID(),
      exerciseId,
      emulatedActor: actorProfile.name || actorProfile.id,
      phases,
      infrastructure,
      payloads
    };

    this.emulationPlans.set(plan.id, plan);
    exercise.emulatedActor = plan.emulatedActor;

    return plan;
  }

  /**
   * Record attack chain event
   */
  recordAttackEvent(
    exerciseId: string,
    event: Omit<AttackChain, 'id' | 'exerciseId' | 'timestamp'>
  ): AttackChain {
    const chainEvent: AttackChain = {
      ...event,
      id: crypto.randomUUID(),
      exerciseId,
      timestamp: new Date()
    };

    const chain = this.attackChains.get(exerciseId) || [];
    chain.push(chainEvent);
    this.attackChains.set(exerciseId, chain);

    // Update exercise TTPs
    const exercise = this.exercises.get(exerciseId);
    if (exercise && !exercise.ttpsUsed.includes(event.technique)) {
      exercise.ttpsUsed.push(event.technique);
    }

    return chainEvent;
  }

  /**
   * Add finding to exercise
   */
  addFinding(
    exerciseId: string,
    finding: Omit<Exercise['findings'][0], 'id' | 'status'>
  ): void {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) {
      throw new Error(`Exercise ${exerciseId} not found`);
    }

    exercise.findings.push({
      ...finding,
      id: crypto.randomUUID(),
      status: 'OPEN'
    });
  }

  /**
   * Calculate exercise metrics
   */
  calculateMetrics(exerciseId: string): Exercise['metrics'] {
    const exercise = this.exercises.get(exerciseId);
    const chain = this.attackChains.get(exerciseId) || [];

    if (!exercise) {
      throw new Error(`Exercise ${exerciseId} not found`);
    }

    const totalActions = chain.length;
    const detectedActions = chain.filter(e => e.detectionDetails.detected).length;
    const successfulActions = chain.filter(e => e.result === 'SUCCESS').length;

    // Calculate detection times
    const detectionTimes = chain
      .filter(e => e.detectionDetails.detected && e.detectionDetails.detectionTime)
      .map(e => e.detectionDetails.detectionTime!.getTime() - e.timestamp.getTime());

    const metrics: Exercise['metrics'] = {
      objectivesAchieved: this.calculateObjectivesAchieved(exercise, chain),
      detectionRate: totalActions > 0 ? detectedActions / totalActions : 0,
      meanTimeToDetect: detectionTimes.length > 0
        ? detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length / 60000 // minutes
        : -1,
      meanTimeToRespond: -1, // Would need blue team response data
      criticalFindingsCount: exercise.findings.filter(f => f.severity === 'CRITICAL').length
    };

    exercise.metrics = metrics;
    return metrics;
  }

  /**
   * Generate exercise report
   */
  generateReport(exerciseId: string): {
    executive: string;
    findings: any[];
    attackChain: any[];
    metrics: any;
    recommendations: string[];
  } {
    const exercise = this.exercises.get(exerciseId);
    const chain = this.attackChains.get(exerciseId) || [];

    if (!exercise) {
      throw new Error(`Exercise ${exerciseId} not found`);
    }

    const metrics = exercise.metrics || this.calculateMetrics(exerciseId);

    return {
      executive: this.generateExecutiveSummary(exercise, metrics),
      findings: exercise.findings.sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      attackChain: chain.map(e => ({
        timestamp: e.timestamp,
        phase: e.phase,
        technique: e.technique,
        result: e.result,
        detected: e.detectionDetails.detected
      })),
      metrics,
      recommendations: this.generateRecommendations(exercise, metrics)
    };
  }

  /**
   * Compare exercise results against baseline
   */
  compareToBaseline(exerciseId: string, baselineId: string): {
    improvements: string[];
    regressions: string[];
    unchanged: string[];
    overallTrend: 'IMPROVED' | 'STABLE' | 'DEGRADED';
  } {
    const current = this.exercises.get(exerciseId);
    const baseline = this.exercises.get(baselineId);

    if (!current || !baseline) {
      throw new Error('Exercise not found');
    }

    const currentMetrics = current.metrics || this.calculateMetrics(exerciseId);
    const baselineMetrics = baseline.metrics || this.calculateMetrics(baselineId);

    const improvements: string[] = [];
    const regressions: string[] = [];
    const unchanged: string[] = [];

    // Compare detection rate
    if (currentMetrics.detectionRate > baselineMetrics.detectionRate + 0.1) {
      improvements.push(`Detection rate improved from ${(baselineMetrics.detectionRate * 100).toFixed(1)}% to ${(currentMetrics.detectionRate * 100).toFixed(1)}%`);
    } else if (currentMetrics.detectionRate < baselineMetrics.detectionRate - 0.1) {
      regressions.push(`Detection rate decreased from ${(baselineMetrics.detectionRate * 100).toFixed(1)}% to ${(currentMetrics.detectionRate * 100).toFixed(1)}%`);
    } else {
      unchanged.push('Detection rate stable');
    }

    // Compare MTTD
    if (currentMetrics.meanTimeToDetect < baselineMetrics.meanTimeToDetect * 0.8) {
      improvements.push(`Mean time to detect improved by ${((1 - currentMetrics.meanTimeToDetect / baselineMetrics.meanTimeToDetect) * 100).toFixed(1)}%`);
    } else if (currentMetrics.meanTimeToDetect > baselineMetrics.meanTimeToDetect * 1.2) {
      regressions.push(`Mean time to detect increased by ${((currentMetrics.meanTimeToDetect / baselineMetrics.meanTimeToDetect - 1) * 100).toFixed(1)}%`);
    } else {
      unchanged.push('Mean time to detect stable');
    }

    // Determine overall trend
    let overallTrend: 'IMPROVED' | 'STABLE' | 'DEGRADED';
    if (improvements.length > regressions.length) {
      overallTrend = 'IMPROVED';
    } else if (regressions.length > improvements.length) {
      overallTrend = 'DEGRADED';
    } else {
      overallTrend = 'STABLE';
    }

    return { improvements, regressions, unchanged, overallTrend };
  }

  // Private helper methods

  private mapActorTTPs(actorProfile: any, targetEnvironment: any): EmulationPlan['phases'] {
    return [
      {
        phase: 1,
        name: 'Initial Reconnaissance',
        objective: 'Gather target information',
        techniques: [
          {
            mitreId: 'T1595',
            name: 'Active Scanning',
            procedure: 'Perform network reconnaissance',
            tools: ['nmap', 'masscan'],
            expectedDetection: false
          }
        ],
        successCriteria: ['Identify target IP ranges', 'Map network topology'],
        abortCriteria: ['Detection by security team']
      },
      {
        phase: 2,
        name: 'Initial Access',
        objective: 'Gain foothold in target network',
        techniques: [
          {
            mitreId: 'T1566.001',
            name: 'Spearphishing Attachment',
            procedure: 'Send targeted phishing emails',
            tools: ['custom_dropper'],
            expectedDetection: true
          }
        ],
        successCriteria: ['At least one successful compromise'],
        abortCriteria: ['All attempts blocked', 'IR team activated']
      },
      {
        phase: 3,
        name: 'Persistence & Escalation',
        objective: 'Establish persistence and escalate privileges',
        techniques: [
          {
            mitreId: 'T1547',
            name: 'Boot or Logon Autostart Execution',
            procedure: 'Install persistence mechanism',
            tools: ['custom_implant'],
            expectedDetection: true
          }
        ],
        successCriteria: ['Persistent access established', 'Admin privileges obtained'],
        abortCriteria: ['Implant detected and removed']
      },
      {
        phase: 4,
        name: 'Objective Execution',
        objective: 'Achieve exercise objectives',
        techniques: [
          {
            mitreId: 'T1041',
            name: 'Exfiltration Over C2 Channel',
            procedure: 'Extract target data',
            tools: ['custom_exfil'],
            expectedDetection: true
          }
        ],
        successCriteria: ['Objective data obtained', 'Exfiltration successful'],
        abortCriteria: ['Network access revoked', 'Exercise time expired']
      }
    ];
  }

  private planInfrastructure(phases: any[]): EmulationPlan['infrastructure'] {
    return {
      c2Servers: ['c2.redteam.internal'],
      redirectors: ['redirect1.cdn.example.com', 'redirect2.cdn.example.com'],
      payloadHosts: ['payload.redteam.internal'],
      exfilEndpoints: ['exfil.redteam.internal']
    };
  }

  private planPayloads(phases: any[], actorProfile: any): EmulationPlan['payloads'] {
    return [
      {
        name: 'initial_dropper',
        type: 'DROPPER',
        hash: 'sha256:abc123...',
        capabilities: ['download', 'execute', 'persistence']
      },
      {
        name: 'main_implant',
        type: 'RAT',
        hash: 'sha256:def456...',
        capabilities: ['c2', 'screenshot', 'keylog', 'exfil']
      }
    ];
  }

  private calculateObjectivesAchieved(exercise: Exercise, chain: AttackChain[]): number {
    // Calculate based on successful actions vs objectives
    const successfulActions = chain.filter(e => e.result === 'SUCCESS').length;
    const totalObjectives = exercise.objectives.length;
    return Math.min(successfulActions / Math.max(totalObjectives, 1), 1);
  }

  private generateExecutiveSummary(exercise: Exercise, metrics: any): string {
    return `
## Executive Summary

**Exercise:** ${exercise.name}
**Type:** ${exercise.type}
**Status:** ${exercise.status}

### Key Findings

- **Detection Rate:** ${(metrics.detectionRate * 100).toFixed(1)}%
- **Mean Time to Detect:** ${metrics.meanTimeToDetect > 0 ? `${metrics.meanTimeToDetect.toFixed(1)} minutes` : 'N/A'}
- **Critical Findings:** ${metrics.criticalFindingsCount}
- **Objectives Achieved:** ${(metrics.objectivesAchieved * 100).toFixed(1)}%

### Summary

The red team exercise ${metrics.detectionRate > 0.7 ? 'was largely detected' : 'achieved significant access'} with ${exercise.findings.length} total findings identified.
    `.trim();
  }

  private generateRecommendations(exercise: Exercise, metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.detectionRate < 0.5) {
      recommendations.push('Improve detection capabilities across attack lifecycle');
      recommendations.push('Implement additional monitoring for TTPs used in exercise');
    }

    if (metrics.meanTimeToDetect > 30) {
      recommendations.push('Reduce mean time to detect through automation');
      recommendations.push('Implement real-time alerting for high-severity events');
    }

    if (metrics.criticalFindingsCount > 0) {
      recommendations.push('Prioritize remediation of critical findings');
    }

    // Add finding-specific recommendations
    for (const finding of exercise.findings.filter(f => f.severity === 'CRITICAL')) {
      recommendations.push(finding.recommendation);
    }

    return recommendations;
  }

  // Public API

  getExercise(id: string): Exercise | undefined {
    return this.exercises.get(id);
  }

  getAllExercises(): Exercise[] {
    return Array.from(this.exercises.values());
  }

  getAttackChain(exerciseId: string): AttackChain[] {
    return this.attackChains.get(exerciseId) || [];
  }

  updateExerciseStatus(id: string, status: Exercise['status']): void {
    const exercise = this.exercises.get(id);
    if (exercise) {
      exercise.status = status;
      if (status === 'IN_PROGRESS' && !exercise.timeline.actualStart) {
        exercise.timeline.actualStart = new Date();
      }
      if (status === 'COMPLETED' && !exercise.timeline.actualEnd) {
        exercise.timeline.actualEnd = new Date();
      }
    }
  }
}

/**
 * Automated Response Orchestrator
 */
export class AutomatedResponseOrchestrator {
  private playbooks: Map<string, any> = new Map();
  private activeResponses: Map<string, any> = new Map();

  /**
   * Register response playbook
   */
  registerPlaybook(playbook: {
    id: string;
    name: string;
    triggerConditions: Array<{ field: string; operator: string; value: any }>;
    actions: Array<{
      order: number;
      action: string;
      parameters: Record<string, any>;
      timeout: number;
      onFailure: 'CONTINUE' | 'ABORT' | 'ESCALATE';
    }>;
    approvalRequired: boolean;
    maxExecutions: number;
  }): void {
    this.playbooks.set(playbook.id, playbook);
  }

  /**
   * Evaluate and execute response
   */
  async evaluateAndRespond(alert: any): Promise<{
    playbookId: string | null;
    executed: boolean;
    actions: Array<{ action: string; result: string; duration: number }>;
    requiresApproval: boolean;
  }> {
    // Find matching playbook
    const matchingPlaybook = this.findMatchingPlaybook(alert);

    if (!matchingPlaybook) {
      return {
        playbookId: null,
        executed: false,
        actions: [],
        requiresApproval: false
      };
    }

    if (matchingPlaybook.approvalRequired) {
      return {
        playbookId: matchingPlaybook.id,
        executed: false,
        actions: [],
        requiresApproval: true
      };
    }

    // Execute playbook
    const result = await this.executePlaybook(matchingPlaybook, alert);

    return {
      playbookId: matchingPlaybook.id,
      executed: true,
      actions: result.actions,
      requiresApproval: false
    };
  }

  /**
   * Execute approved response
   */
  async executeApprovedResponse(
    playbookId: string,
    alert: any,
    approver: string
  ): Promise<any> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`Playbook ${playbookId} not found`);
    }

    return this.executePlaybook(playbook, alert, approver);
  }

  private findMatchingPlaybook(alert: any): any {
    for (const playbook of this.playbooks.values()) {
      if (this.evaluateConditions(playbook.triggerConditions, alert)) {
        return playbook;
      }
    }
    return null;
  }

  private evaluateConditions(conditions: any[], alert: any): boolean {
    return conditions.every(cond => {
      const value = alert[cond.field];
      switch (cond.operator) {
        case 'equals': return value === cond.value;
        case 'contains': return String(value).includes(cond.value);
        case 'greater_than': return value > cond.value;
        case 'less_than': return value < cond.value;
        case 'in': return cond.value.includes(value);
        default: return false;
      }
    });
  }

  private async executePlaybook(playbook: any, alert: any, approver?: string): Promise<any> {
    const responseId = crypto.randomUUID();
    const actions: Array<{ action: string; result: string; duration: number }> = [];

    this.activeResponses.set(responseId, {
      playbookId: playbook.id,
      alert,
      startTime: new Date(),
      approver,
      status: 'IN_PROGRESS'
    });

    for (const action of playbook.actions.sort((a: any, b: any) => a.order - b.order)) {
      const startTime = Date.now();
      try {
        await this.executeAction(action, alert);
        actions.push({
          action: action.action,
          result: 'SUCCESS',
          duration: Date.now() - startTime
        });
      } catch (error) {
        actions.push({
          action: action.action,
          result: 'FAILURE',
          duration: Date.now() - startTime
        });

        if (action.onFailure === 'ABORT') {
          break;
        }
      }
    }

    this.activeResponses.get(responseId).status = 'COMPLETED';
    this.activeResponses.get(responseId).endTime = new Date();

    return { responseId, actions };
  }

  private async executeAction(action: any, alert: any): Promise<void> {
    // Simulate action execution
    switch (action.action) {
      case 'ISOLATE_HOST':
        console.log(`Isolating host: ${action.parameters.host}`);
        break;
      case 'BLOCK_IP':
        console.log(`Blocking IP: ${action.parameters.ip}`);
        break;
      case 'DISABLE_ACCOUNT':
        console.log(`Disabling account: ${action.parameters.account}`);
        break;
      case 'COLLECT_EVIDENCE':
        console.log(`Collecting evidence from: ${action.parameters.target}`);
        break;
      case 'NOTIFY':
        console.log(`Notifying: ${action.parameters.recipients}`);
        break;
      default:
        console.log(`Executing: ${action.action}`);
    }

    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  getActiveResponses(): any[] {
    return Array.from(this.activeResponses.values());
  }

  getPlaybooks(): any[] {
    return Array.from(this.playbooks.values());
  }
}

export { RedTeamManager, AutomatedResponseOrchestrator };
