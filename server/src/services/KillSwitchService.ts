import { logger } from '../config/logger.js';

export type KillSwitchScope = 'global' | 'agent' | 'feature' | 'tenant';

interface KillSwitchState {
    global: boolean;
    agents: Set<string>;
    features: Set<string>;
    tenants: Set<string>;
}

export class KillSwitchService {
    private static instance: KillSwitchService;
    private state: KillSwitchState = {
        global: false,
        agents: new Set(),
        features: new Set(),
        tenants: new Set(),
    };

    private constructor() {}

    public static getInstance(): KillSwitchService {
        if (!KillSwitchService.instance) {
            KillSwitchService.instance = new KillSwitchService();
        }
        return KillSwitchService.instance;
    }

    public engageGlobalKillSwitch(actor: string, reason: string): void {
        this.state.global = true;
        logger.fatal({ actor, reason }, 'GLOBAL KILL SWITCH ENGAGED');
    }

    public disengageGlobalKillSwitch(actor: string, reason: string): void {
        this.state.global = false;
        logger.info({ actor, reason }, 'Global Kill Switch Disengaged');
    }

    public isGlobalKillSwitchActive(): boolean {
        return this.state.global;
    }

    public killAgent(agentId: string, actor: string, reason: string): void {
        this.state.agents.add(agentId);
        logger.warn({ agentId, actor, reason }, 'Agent Kill Switch Engaged');
    }

    public reviveAgent(agentId: string, actor: string, reason: string): void {
        this.state.agents.delete(agentId);
        logger.info({ agentId, actor, reason }, 'Agent Kill Switch Disengaged');
    }

    public isAgentKilled(agentId: string): boolean {
        return this.state.global || this.state.agents.has(agentId);
    }

    public killFeature(featureKey: string, actor: string, reason: string): void {
        this.state.features.add(featureKey);
        logger.warn({ featureKey, actor, reason }, 'Feature Kill Switch Engaged');
    }

    public reviveFeature(featureKey: string, actor: string, reason: string): void {
        this.state.features.delete(featureKey);
        logger.info({ featureKey, actor, reason }, 'Feature Kill Switch Disengaged');
    }

    public isFeatureKilled(featureKey: string): boolean {
        return this.state.global || this.state.features.has(featureKey);
    }

    public killTenant(tenantId: string, actor: string, reason: string): void {
        this.state.tenants.add(tenantId);
        logger.warn({ tenantId, actor, reason }, 'Tenant Kill Switch Engaged');
    }

    public reviveTenant(tenantId: string, actor: string, reason: string): void {
        this.state.tenants.delete(tenantId);
        logger.info({ tenantId, actor, reason }, 'Tenant Kill Switch Disengaged');
    }

    public isTenantKilled(tenantId: string): boolean {
        return this.state.global || this.state.tenants.has(tenantId);
    }

    public checkSystemHealth(context?: { agentId?: string; tenantId?: string; feature?: string }): { allowed: boolean; reason?: string } {
        if (this.state.global) {
            return { allowed: false, reason: 'Global Kill Switch is Active' };
        }
        if (context?.agentId && this.state.agents.has(context.agentId)) {
             return { allowed: false, reason: `Agent ${context.agentId} is kill-switched` };
        }
        if (context?.tenantId && this.state.tenants.has(context.tenantId)) {
             return { allowed: false, reason: `Tenant ${context.tenantId} is kill-switched` };
        }
        if (context?.feature && this.state.features.has(context.feature)) {
             return { allowed: false, reason: `Feature ${context.feature} is kill-switched` };
        }

        return { allowed: true };
    }
}

export const killSwitchService = KillSwitchService.getInstance();
