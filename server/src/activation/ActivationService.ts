import { canonicalEventSchema, CanonicalEvent } from './events.js';
import { ChecklistService, ChecklistState } from './ChecklistService.js';
import { GuidedSetupValidator } from './GuidedSetupValidator.js';
import { StarterDataService, StarterTemplate } from './StarterDataService.js';
import { EntitlementService, PlanName, UpgradePrompt } from './EntitlementService.js';
import { ExperimentExposureService } from './ExperimentExposureService.js';
import { FixItPanelService, FixItAction } from './FixItPanelService.js';

export type FunnelMetrics = {
  started: number;
  completed: number;
  dropOffByStep: Record<string, number>;
  ahaRateWithin15m: number;
};

export type ActivationSnapshot = {
  workspaceId: string;
  role?: 'admin' | 'operator' | 'viewer';
  startedAt: Date;
  lastEventAt: Date;
  ahaAt?: Date;
};

export class ActivationService {
  private sessions = new Map<string, ActivationSnapshot>();
  private funnelSteps: Record<'admin' | 'operator' | 'viewer', string[]> = {
    admin: [
      'workspace_created',
      'role_assigned',
      'starter_data_provisioned',
      'guided_step_completed:sso',
      'guided_step_completed:invites',
      'entity_linked',
      'insight_saved',
    ],
    operator: [
      'workspace_created',
      'role_assigned',
      'starter_data_provisioned',
      'guided_step_completed:integration',
      'entity_linked',
      'insight_saved',
    ],
    viewer: [
      'workspace_created',
      'role_assigned',
      'starter_data_provisioned',
      'entity_linked',
      'insight_saved',
    ],
  };

  private dropOffByStep: Record<string, number> = {};
  private checklistService = new ChecklistService();
  private guidedSetupValidator = new GuidedSetupValidator();
  private starterDataService = new StarterDataService();
  private entitlementService = new EntitlementService();
  private experimentService = new ExperimentExposureService();
  private fixItPanelService = new FixItPanelService();

  recordEvent(rawEvent: CanonicalEvent): {
    event: CanonicalEvent;
    checklist: ChecklistState;
    prompt?: UpgradePrompt;
    fixIt?: FixItAction[];
  } {
    const event = canonicalEventSchema.parse(rawEvent);
    const session = this.sessions.get(event.workspaceId) ?? {
      workspaceId: event.workspaceId,
      role: event.role,
      startedAt: event.timestamp,
      lastEventAt: event.timestamp,
    };
    session.lastEventAt = event.timestamp;
    if (!session.role && event.role) {
      session.role = event.role;
    }
    this.sessions.set(event.workspaceId, session);

    this.updateDropOff(session, event);

    const checklist = this.checklistService.handleEvent(event);
    let prompt: UpgradePrompt | undefined;
    if (event.type === 'insight_saved' && session.role) {
      prompt = this.entitlementService.buildAhaPrompt(event.workspaceId, this.planForRole(session.role));
    }
    if (event.type === 'plan_limit_hit' && session.role) {
      prompt = this.entitlementService.meterUsage(
        event.workspaceId,
        this.planForRole(session.role),
        'analyses',
        1,
        event.id,
      ).prompt;
    }

    let fixIt: FixItAction[] | undefined;
    if (['validation_error', 'integration_failed', 'entitlement_blocked'].includes(event.type)) {
      fixIt = this.fixItPanelService.recordFailure(event.workspaceId, event);
    }

    if (event.type === 'starter_data_provisioned') {
      this.starterDataService.provision(event.workspaceId, this.templateForRole(event.role ?? 'analyst'));
    }

    if (event.type === 'insight_saved') {
      session.ahaAt = event.timestamp;
      if (session.role) {
        this.experimentService.logExposure(event.workspaceId, 'activation.valuePrompt');
      }
    }

    return { event, checklist, prompt, fixIt };
  }

  getMetrics(): FunnelMetrics {
    const started = this.sessions.size;
    const completed = [...this.sessions.values()].filter((s) => Boolean(s.ahaAt)).length;
    const ahaRateWithin15m = this.computeAhaRateWithinMinutes(15);
    return {
      started,
      completed,
      dropOffByStep: this.dropOffByStep,
      ahaRateWithin15m,
    };
  }

  computeAhaRateWithinMinutes(minutes: number): number {
    const limitMs = minutes * 60 * 1000;
    const entries = [...this.sessions.values()];
    if (!entries.length) return 0;
    const successes = entries.filter((session) =>
      session.ahaAt ? session.ahaAt.getTime() - session.startedAt.getTime() <= limitMs : false,
    ).length;
    return successes / entries.length;
  }

  validateWorkspace(payload: unknown) {
    return this.guidedSetupValidator.validateWorkspace(payload);
  }

  validateIntegration(payload: unknown) {
    return this.guidedSetupValidator.validateIntegration(payload);
  }

  getChecklist(workspaceId: string): ChecklistState {
    return this.checklistService.getChecklist(workspaceId);
  }

  getStarterData(workspaceId: string) {
    return this.starterDataService.get(workspaceId);
  }

  getFixIt(workspaceId: string): FixItAction[] {
    return this.fixItPanelService.getActions(workspaceId);
  }

  getEntitlements(plan: PlanName) {
    return this.entitlementService.getPlan(plan);
  }

  logExposure(workspaceId: string, flag: string) {
    return this.experimentService.logExposure(workspaceId, flag);
  }

  private planForRole(role: 'admin' | 'operator' | 'viewer'): PlanName {
    if (role === 'viewer') return 'free';
    if (role === 'operator') return 'pro';
    return 'pro';
  }

  private templateForRole(role: 'admin' | 'operator' | 'viewer' | 'analyst'): StarterTemplate {
    if (role === 'viewer') return 'viewer';
    if (role === 'operator') return 'operator';
    return 'analyst';
  }

  private updateDropOff(session: ActivationSnapshot, event: CanonicalEvent) {
    const role = session.role ?? event.role ?? 'viewer';
    const steps = this.funnelSteps[role];
    const stepKey = this.stepKey(event);
    const index = steps.indexOf(stepKey);
    if (index === -1) return;
    for (let i = 0; i <= index; i += 1) {
      const key = steps[i];
      this.dropOffByStep[key] = (this.dropOffByStep[key] ?? 0) + 1;
    }
  }

  private stepKey(event: CanonicalEvent): string {
    if (event.type === 'guided_step_completed' && event.stepName) {
      return `guided_step_completed:${event.stepName}`;
    }
    return event.type;
  }
}
