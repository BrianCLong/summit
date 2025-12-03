/**
 * Auto-Remediation Hooks
 * Implements automated response actions for threat hunting findings
 * with CTI/OSINT integration and safety controls
 */

import { EventEmitter } from 'events';
import logger from '../config/logger.js';
import type {
  EnrichedFinding,
  HuntFinding,
  RemediationPlan,
  RemediationAction,
  RemediationResult,
  RemediationStatus,
  RemediationActionStatus,
  RemediationTarget,
  ActionType,
  CTICorrelation,
  OSINTData,
  IOCReference,
  ThreatSeverity,
} from './types.js';

interface CTISource {
  name: string;
  type: 'misp' | 'otx' | 'virustotal' | 'shodan' | 'censys' | 'custom';
  apiKey?: string;
  baseUrl: string;
  enabled: boolean;
}

interface OSINTSource {
  name: string;
  type: 'pastebin' | 'github' | 'twitter' | 'reddit' | 'custom';
  enabled: boolean;
}

interface RemediationHook {
  name: string;
  type: 'pre' | 'post';
  actionTypes: ActionType[];
  handler: (action: RemediationAction, context: RemediationContext) => Promise<HookResult>;
}

interface RemediationContext {
  huntId: string;
  finding: EnrichedFinding;
  plan: RemediationPlan;
  previousResults: RemediationResult[];
}

interface HookResult {
  proceed: boolean;
  message?: string;
  modifiedAction?: Partial<RemediationAction>;
}

interface RemediationExecutor {
  actionType: ActionType;
  execute: (action: RemediationAction, target: RemediationTarget) => Promise<RemediationResult>;
  rollback?: (action: RemediationAction, target: RemediationTarget) => Promise<RemediationResult>;
}

const DEFAULT_CTI_SOURCES: CTISource[] = [
  { name: 'MISP', type: 'misp', baseUrl: 'https://misp.local', enabled: true },
  { name: 'AlienVault OTX', type: 'otx', baseUrl: 'https://otx.alienvault.com/api/v1', enabled: true },
  { name: 'VirusTotal', type: 'virustotal', baseUrl: 'https://www.virustotal.com/api/v3', enabled: true },
  { name: 'Shodan', type: 'shodan', baseUrl: 'https://api.shodan.io', enabled: true },
  { name: 'Censys', type: 'censys', baseUrl: 'https://search.censys.io/api', enabled: true },
];

const DEFAULT_OSINT_SOURCES: OSINTSource[] = [
  { name: 'Pastebin', type: 'pastebin', enabled: true },
  { name: 'GitHub', type: 'github', enabled: true },
  { name: 'Twitter/X', type: 'twitter', enabled: true },
  { name: 'Reddit', type: 'reddit', enabled: true },
];

export class AutoRemediationHooks extends EventEmitter {
  private ctiSources: Map<string, CTISource> = new Map();
  private osintSources: Map<string, OSINTSource> = new Map();
  private hooks: Map<string, RemediationHook> = new Map();
  private executors: Map<ActionType, RemediationExecutor> = new Map();
  private activePlans: Map<string, RemediationPlan> = new Map();
  private approvalQueue: Map<string, RemediationPlan> = new Map();

  constructor() {
    super();
    this.initializeSources();
    this.registerDefaultHooks();
    this.registerDefaultExecutors();
  }

  /**
   * Initialize CTI and OSINT sources
   */
  private initializeSources(): void {
    for (const source of DEFAULT_CTI_SOURCES) {
      this.ctiSources.set(source.name, source);
    }
    for (const source of DEFAULT_OSINT_SOURCES) {
      this.osintSources.set(source.name, source);
    }
  }

  /**
   * Register default pre/post remediation hooks
   */
  private registerDefaultHooks(): void {
    // Pre-remediation: Validate scope
    this.registerHook({
      name: 'validate_scope',
      type: 'pre',
      actionTypes: ['ISOLATE_HOST', 'DISABLE_ACCOUNT', 'REVOKE_CREDENTIALS'],
      handler: async (action, context) => {
        const target = action.target;

        // Don't remediate critical infrastructure without explicit approval
        if (target.criticality === 'CRITICAL') {
          return {
            proceed: false,
            message: `Action blocked: Target ${target.name} is critical infrastructure. Manual approval required.`,
          };
        }

        return { proceed: true };
      },
    });

    // Pre-remediation: Check confidence threshold
    this.registerHook({
      name: 'confidence_check',
      type: 'pre',
      actionTypes: [
        'BLOCK_IP',
        'BLOCK_DOMAIN',
        'QUARANTINE_FILE',
        'DISABLE_ACCOUNT',
        'ISOLATE_HOST',
      ],
      handler: async (action, context) => {
        if (context.finding.confidence < 0.8) {
          return {
            proceed: false,
            message: `Action blocked: Finding confidence (${context.finding.confidence}) below threshold (0.8)`,
          };
        }
        return { proceed: true };
      },
    });

    // Pre-remediation: Rate limiting
    this.registerHook({
      name: 'rate_limit',
      type: 'pre',
      actionTypes: [
        'BLOCK_IP',
        'BLOCK_DOMAIN',
        'DISABLE_ACCOUNT',
        'ISOLATE_HOST',
        'KILL_PROCESS',
      ],
      handler: async (action, context) => {
        const recentActions = context.previousResults.filter(
          (r) => Date.now() - r.timestamp.getTime() < 60000 // Last minute
        );

        if (recentActions.length >= 10) {
          return {
            proceed: false,
            message: 'Rate limit exceeded: Too many remediation actions in short time',
          };
        }

        return { proceed: true };
      },
    });

    // Post-remediation: Verify and log
    this.registerHook({
      name: 'verify_and_log',
      type: 'post',
      actionTypes: [
        'BLOCK_IP',
        'BLOCK_DOMAIN',
        'QUARANTINE_FILE',
        'DISABLE_ACCOUNT',
        'ISOLATE_HOST',
      ],
      handler: async (action, context) => {
        // Log the action for audit
        logger.info('Remediation action completed', {
          huntId: context.huntId,
          actionId: action.id,
          actionType: action.actionType,
          target: action.target.id,
          findingId: action.findingId,
        });

        this.emit('remediation_completed', {
          huntId: context.huntId,
          action,
          context,
        });

        return { proceed: true };
      },
    });

    // Post-remediation: Update threat intelligence
    this.registerHook({
      name: 'update_threat_intel',
      type: 'post',
      actionTypes: ['BLOCK_IP', 'BLOCK_DOMAIN', 'QUARANTINE_FILE'],
      handler: async (action, context) => {
        // Update internal threat intelligence with confirmed IOCs
        const iocs = context.finding.iocsIdentified;

        for (const ioc of iocs) {
          this.emit('ioc_confirmed', {
            ioc,
            action: action.actionType,
            huntId: context.huntId,
            confidence: context.finding.confidence,
          });
        }

        return { proceed: true };
      },
    });
  }

  /**
   * Register default action executors
   */
  private registerDefaultExecutors(): void {
    // Block IP executor
    this.registerExecutor({
      actionType: 'BLOCK_IP',
      execute: async (action, target) => {
        const startTime = Date.now();
        try {
          // Simulate firewall API call
          logger.info('Blocking IP address', {
            ip: target.id,
            actionId: action.id,
          });

          // In production, this would call the firewall API
          await this.simulateAction(500);

          return {
            success: true,
            message: `IP ${target.id} blocked successfully`,
            timestamp: new Date(),
            affectedEntities: [target.id],
            metrics: {
              entitiesProcessed: 1,
              entitiesSuccessful: 1,
              entitiesFailed: 0,
              executionTimeMs: Date.now() - startTime,
            },
            rollbackAvailable: true,
          };
        } catch (error) {
          return {
            success: false,
            message: `Failed to block IP: ${(error as Error).message}`,
            timestamp: new Date(),
            affectedEntities: [],
            metrics: {
              entitiesProcessed: 1,
              entitiesSuccessful: 0,
              entitiesFailed: 1,
              executionTimeMs: Date.now() - startTime,
            },
            errors: [(error as Error).message],
            rollbackAvailable: false,
          };
        }
      },
      rollback: async (action, target) => {
        logger.info('Rolling back IP block', { ip: target.id });
        await this.simulateAction(500);
        return {
          success: true,
          message: `IP ${target.id} unblocked`,
          timestamp: new Date(),
          affectedEntities: [target.id],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: 500,
          },
          rollbackAvailable: false,
        };
      },
    });

    // Block domain executor
    this.registerExecutor({
      actionType: 'BLOCK_DOMAIN',
      execute: async (action, target) => {
        const startTime = Date.now();
        logger.info('Blocking domain', { domain: target.id });
        await this.simulateAction(500);

        return {
          success: true,
          message: `Domain ${target.id} blocked in DNS sinkhole`,
          timestamp: new Date(),
          affectedEntities: [target.id],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: Date.now() - startTime,
          },
          rollbackAvailable: true,
        };
      },
    });

    // Quarantine file executor
    this.registerExecutor({
      actionType: 'QUARANTINE_FILE',
      execute: async (action, target) => {
        const startTime = Date.now();
        logger.info('Quarantining file', { hash: target.id });
        await this.simulateAction(1000);

        return {
          success: true,
          message: `File ${target.id} quarantined across endpoints`,
          timestamp: new Date(),
          affectedEntities: [target.id],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: Date.now() - startTime,
          },
          rollbackAvailable: true,
        };
      },
    });

    // Disable account executor
    this.registerExecutor({
      actionType: 'DISABLE_ACCOUNT',
      execute: async (action, target) => {
        const startTime = Date.now();
        logger.info('Disabling account', { accountId: target.id });
        await this.simulateAction(800);

        return {
          success: true,
          message: `Account ${target.name} disabled`,
          timestamp: new Date(),
          affectedEntities: [target.id],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: Date.now() - startTime,
          },
          rollbackAvailable: true,
        };
      },
    });

    // Isolate host executor
    this.registerExecutor({
      actionType: 'ISOLATE_HOST',
      execute: async (action, target) => {
        const startTime = Date.now();
        logger.info('Isolating host', { hostId: target.id });
        await this.simulateAction(2000);

        return {
          success: true,
          message: `Host ${target.name} isolated from network`,
          timestamp: new Date(),
          affectedEntities: [target.id],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: Date.now() - startTime,
          },
          rollbackAvailable: true,
        };
      },
    });

    // Kill process executor
    this.registerExecutor({
      actionType: 'KILL_PROCESS',
      execute: async (action, target) => {
        const startTime = Date.now();
        logger.info('Killing process', { processId: target.id });
        await this.simulateAction(300);

        return {
          success: true,
          message: `Process ${target.name} terminated`,
          timestamp: new Date(),
          affectedEntities: [target.id],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: Date.now() - startTime,
          },
          rollbackAvailable: false,
        };
      },
    });

    // Alert team executor
    this.registerExecutor({
      actionType: 'ALERT_TEAM',
      execute: async (action, target) => {
        const startTime = Date.now();
        logger.info('Sending alert', { target: target.id });

        // In production, send to Slack, PagerDuty, etc.
        this.emit('alert_sent', {
          actionId: action.id,
          target,
          finding: action.findingId,
        });

        return {
          success: true,
          message: 'Security team alerted',
          timestamp: new Date(),
          affectedEntities: [],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: Date.now() - startTime,
          },
          rollbackAvailable: false,
        };
      },
    });

    // Create ticket executor
    this.registerExecutor({
      actionType: 'CREATE_TICKET',
      execute: async (action, target) => {
        const startTime = Date.now();
        const ticketId = `TKT-${Date.now()}`;
        logger.info('Creating ticket', { ticketId, target: target.id });

        return {
          success: true,
          message: `Ticket ${ticketId} created`,
          timestamp: new Date(),
          affectedEntities: [ticketId],
          metrics: {
            entitiesProcessed: 1,
            entitiesSuccessful: 1,
            entitiesFailed: 0,
            executionTimeMs: Date.now() - startTime,
          },
          rollbackAvailable: false,
        };
      },
    });
  }

  /**
   * Simulate async action for demo purposes
   */
  private async simulateAction(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * Register a CTI source
   */
  registerCTISource(source: CTISource): void {
    this.ctiSources.set(source.name, source);
    logger.info('CTI source registered', { name: source.name, type: source.type });
  }

  /**
   * Register an OSINT source
   */
  registerOSINTSource(source: OSINTSource): void {
    this.osintSources.set(source.name, source);
    logger.info('OSINT source registered', { name: source.name, type: source.type });
  }

  /**
   * Register a remediation hook
   */
  registerHook(hook: RemediationHook): void {
    this.hooks.set(hook.name, hook);
    logger.debug('Remediation hook registered', { name: hook.name, type: hook.type });
  }

  /**
   * Register a remediation executor
   */
  registerExecutor(executor: RemediationExecutor): void {
    this.executors.set(executor.actionType, executor);
    logger.debug('Remediation executor registered', { type: executor.actionType });
  }

  /**
   * Enrich findings with CTI and OSINT data
   */
  async enrichFindings(findings: HuntFinding[]): Promise<EnrichedFinding[]> {
    const enrichedFindings: EnrichedFinding[] = [];

    for (const finding of findings) {
      const ctiCorrelations = await this.fetchCTICorrelations(finding.iocsIdentified);
      const osintData = await this.fetchOSINTData(finding.iocsIdentified);
      const threatActorAttribution = await this.attributeThreatActors(
        ctiCorrelations,
        finding
      );
      const campaignAssociations = await this.findCampaignAssociations(
        ctiCorrelations,
        finding
      );

      enrichedFindings.push({
        ...finding,
        ctiCorrelations,
        osintData,
        threatActorAttribution,
        campaignAssociations,
        enrichmentTimestamp: new Date(),
      });
    }

    this.emit('findings_enriched', {
      count: enrichedFindings.length,
      ctiMatchesFound: enrichedFindings.reduce(
        (sum, f) => sum + f.ctiCorrelations.length,
        0
      ),
    });

    return enrichedFindings;
  }

  /**
   * Fetch CTI correlations for IOCs
   */
  private async fetchCTICorrelations(iocs: IOCReference[]): Promise<CTICorrelation[]> {
    const correlations: CTICorrelation[] = [];

    for (const [name, source] of this.ctiSources) {
      if (!source.enabled) continue;

      for (const ioc of iocs) {
        try {
          const correlation = await this.queryCTISource(source, ioc);
          if (correlation) {
            correlations.push(correlation);
          }
        } catch (error) {
          logger.warn('CTI query failed', {
            source: name,
            ioc: ioc.value,
            error: (error as Error).message,
          });
        }
      }
    }

    return correlations;
  }

  /**
   * Query a CTI source for an IOC
   */
  private async queryCTISource(
    source: CTISource,
    ioc: IOCReference
  ): Promise<CTICorrelation | null> {
    // Simulate CTI lookup - in production, make actual API calls
    await this.simulateAction(100);

    // Simulate finding a match with some probability
    if (Math.random() > 0.7) {
      return {
        source: source.name,
        feedName: `${source.name} Threat Feed`,
        matchedIOC: ioc.value,
        confidence: 0.7 + Math.random() * 0.3,
        severity: this.randomSeverity(),
        context: `IOC ${ioc.value} found in ${source.name} threat intelligence`,
        lastUpdated: new Date(),
      };
    }

    return null;
  }

  /**
   * Fetch OSINT data for IOCs
   */
  private async fetchOSINTData(iocs: IOCReference[]): Promise<OSINTData[]> {
    const osintData: OSINTData[] = [];

    for (const [name, source] of this.osintSources) {
      if (!source.enabled) continue;

      for (const ioc of iocs) {
        try {
          const data = await this.queryOSINTSource(source, ioc);
          if (data) {
            osintData.push(data);
          }
        } catch (error) {
          logger.warn('OSINT query failed', {
            source: name,
            ioc: ioc.value,
            error: (error as Error).message,
          });
        }
      }
    }

    return osintData;
  }

  /**
   * Query an OSINT source
   */
  private async queryOSINTSource(
    source: OSINTSource,
    ioc: IOCReference
  ): Promise<OSINTData | null> {
    // Simulate OSINT lookup
    await this.simulateAction(150);

    if (Math.random() > 0.8) {
      return {
        source: source.name,
        type: source.type,
        content: `Reference to ${ioc.value} found on ${source.name}`,
        relevanceScore: 0.5 + Math.random() * 0.5,
        discoveredAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Attribute threat actors based on CTI correlations
   */
  private async attributeThreatActors(
    correlations: CTICorrelation[],
    finding: HuntFinding
  ): Promise<EnrichedFinding['threatActorAttribution']> {
    // Simulate threat actor attribution
    const ttps = finding.ttpsMatched.map((t) => t.id);

    // In production, query threat actor database
    if (correlations.length > 2 && ttps.length > 1) {
      return [
        {
          actorId: `TA-${Date.now()}`,
          actorName: 'APT-SIMULATED',
          aliases: ['SimActor', 'DemoThreat'],
          attributionConfidence: 0.6,
          country: 'Unknown',
          motivation: ['espionage', 'financial'],
          capabilities: ['phishing', 'malware', 'lateral-movement'],
          associatedCampaigns: [],
        },
      ];
    }

    return [];
  }

  /**
   * Find campaign associations
   */
  private async findCampaignAssociations(
    correlations: CTICorrelation[],
    finding: HuntFinding
  ): Promise<EnrichedFinding['campaignAssociations']> {
    // Simulate campaign association
    if (correlations.length > 3) {
      return [
        {
          campaignId: `CAMP-${Date.now()}`,
          campaignName: 'Operation Demo',
          active: true,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          targetSectors: ['technology', 'finance'],
          targetRegions: ['north-america'],
          associationConfidence: 0.5,
        },
      ];
    }

    return [];
  }

  /**
   * Create a remediation plan from enriched findings
   */
  async createRemediationPlan(
    huntId: string,
    findings: EnrichedFinding[],
    approvalRequired: boolean = true
  ): Promise<RemediationPlan> {
    const eligibleFindings = findings.filter((f) => f.autoRemediationEligible);
    const actions: RemediationAction[] = [];
    let executionOrder = 0;

    for (const finding of eligibleFindings) {
      for (const recommendedAction of finding.recommendedActions) {
        if (recommendedAction.automated) {
          const target = this.deriveTargetFromFinding(finding, recommendedAction);

          actions.push({
            id: `action-${Date.now()}-${executionOrder}`,
            findingId: finding.id,
            actionType: recommendedAction.type,
            target,
            parameters: {},
            status: 'pending',
            executionOrder: executionOrder++,
            dependsOn: [],
          });
        }
      }
    }

    const plan: RemediationPlan = {
      id: `plan-${Date.now()}`,
      huntId,
      findings: eligibleFindings.map((f) => f.id),
      actions,
      status: approvalRequired ? 'pending_approval' : 'approved',
      approvalRequired,
      createdAt: new Date(),
    };

    this.activePlans.set(plan.id, plan);

    if (approvalRequired) {
      this.approvalQueue.set(plan.id, plan);
      this.emit('approval_required', { plan });
    }

    logger.info('Remediation plan created', {
      planId: plan.id,
      huntId,
      actionsCount: actions.length,
      approvalRequired,
    });

    return plan;
  }

  /**
   * Derive remediation target from finding
   */
  private deriveTargetFromFinding(
    finding: EnrichedFinding,
    action: HuntFinding['recommendedActions'][0]
  ): RemediationTarget {
    const primaryEntity = finding.entitiesInvolved[0];
    const primaryIOC = finding.iocsIdentified[0];

    return {
      type: primaryEntity?.type || primaryIOC?.type || 'unknown',
      id: primaryEntity?.id || primaryIOC?.id || 'unknown',
      name: primaryEntity?.name || primaryIOC?.value || 'unknown',
      environment: 'production',
      criticality: finding.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Approve a remediation plan
   */
  async approvePlan(planId: string, approver: string): Promise<void> {
    const plan = this.approvalQueue.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found in approval queue`);
    }

    plan.status = 'approved';
    plan.approvedBy = approver;
    plan.approvedAt = new Date();

    this.approvalQueue.delete(planId);
    this.activePlans.set(planId, plan);

    this.emit('plan_approved', { planId, approver });
    logger.info('Remediation plan approved', { planId, approver });
  }

  /**
   * Execute a remediation plan
   */
  async executePlan(planId: string): Promise<RemediationResult[]> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== 'approved') {
      throw new Error(`Plan ${planId} is not approved (status: ${plan.status})`);
    }

    plan.status = 'executing';
    plan.executedAt = new Date();

    const results: RemediationResult[] = [];
    const context: RemediationContext = {
      huntId: plan.huntId,
      finding: null as any, // Will be set per action
      plan,
      previousResults: results,
    };

    // Sort actions by execution order and dependencies
    const sortedActions = this.topologicalSortActions(plan.actions);

    for (const action of sortedActions) {
      try {
        // Run pre-hooks
        const preHookResult = await this.runHooks('pre', action, context);
        if (!preHookResult.proceed) {
          action.status = 'skipped';
          logger.info('Action skipped by pre-hook', {
            actionId: action.id,
            reason: preHookResult.message,
          });
          continue;
        }

        // Execute action
        action.status = 'executing';
        const executor = this.executors.get(action.actionType);

        if (!executor) {
          throw new Error(`No executor for action type: ${action.actionType}`);
        }

        const result = await executor.execute(action, action.target);
        action.result = result;
        action.status = result.success ? 'completed' : 'failed';
        results.push(result);

        // Run post-hooks
        await this.runHooks('post', action, context);
      } catch (error) {
        action.status = 'failed';
        const errorResult: RemediationResult = {
          success: false,
          message: (error as Error).message,
          timestamp: new Date(),
          affectedEntities: [],
          metrics: {
            entitiesProcessed: 0,
            entitiesSuccessful: 0,
            entitiesFailed: 1,
            executionTimeMs: 0,
          },
          errors: [(error as Error).message],
          rollbackAvailable: false,
        };
        action.result = errorResult;
        results.push(errorResult);

        logger.error('Action execution failed', {
          actionId: action.id,
          error: (error as Error).message,
        });
      }
    }

    // Update plan status
    const allSuccessful = results.every((r) => r.success);
    const anySuccessful = results.some((r) => r.success);

    plan.status = allSuccessful
      ? 'completed'
      : anySuccessful
        ? 'partial_success'
        : 'failed';
    plan.completedAt = new Date();

    this.emit('plan_executed', {
      planId,
      status: plan.status,
      results,
    });

    return results;
  }

  /**
   * Run hooks for an action
   */
  private async runHooks(
    type: 'pre' | 'post',
    action: RemediationAction,
    context: RemediationContext
  ): Promise<HookResult> {
    for (const [, hook] of this.hooks) {
      if (hook.type !== type) continue;
      if (!hook.actionTypes.includes(action.actionType)) continue;

      const result = await hook.handler(action, context);
      if (!result.proceed && type === 'pre') {
        return result;
      }
    }

    return { proceed: true };
  }

  /**
   * Topologically sort actions based on dependencies
   */
  private topologicalSortActions(actions: RemediationAction[]): RemediationAction[] {
    const actionMap = new Map(actions.map((a) => [a.id, a]));
    const visited = new Set<string>();
    const result: RemediationAction[] = [];

    const visit = (actionId: string) => {
      if (visited.has(actionId)) return;
      visited.add(actionId);

      const action = actionMap.get(actionId);
      if (!action) return;

      for (const depId of action.dependsOn) {
        visit(depId);
      }

      result.push(action);
    };

    // Sort by execution order first
    const sortedByOrder = [...actions].sort(
      (a, b) => a.executionOrder - b.executionOrder
    );

    for (const action of sortedByOrder) {
      visit(action.id);
    }

    return result;
  }

  /**
   * Rollback a remediation plan
   */
  async rollbackPlan(planId: string): Promise<RemediationResult[]> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const results: RemediationResult[] = [];

    // Rollback in reverse order
    const completedActions = plan.actions
      .filter((a) => a.status === 'completed' && a.result?.rollbackAvailable)
      .reverse();

    for (const action of completedActions) {
      const executor = this.executors.get(action.actionType);
      if (executor?.rollback) {
        try {
          const result = await executor.rollback(action, action.target);
          action.status = 'rolled_back';
          results.push(result);
        } catch (error) {
          logger.error('Rollback failed', {
            actionId: action.id,
            error: (error as Error).message,
          });
        }
      }
    }

    plan.status = 'rolled_back';

    this.emit('plan_rolled_back', { planId, results });

    return results;
  }

  /**
   * Get active plans
   */
  getActivePlans(): RemediationPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): RemediationPlan[] {
    return Array.from(this.approvalQueue.values());
  }

  /**
   * Helper to generate random severity
   */
  private randomSeverity(): ThreatSeverity {
    const severities: ThreatSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return severities[Math.floor(Math.random() * severities.length)];
  }
}

export const autoRemediationHooks = new AutoRemediationHooks();
