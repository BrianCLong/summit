"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.killSwitchService = exports.KillSwitchService = void 0;
const logger_js_1 = require("../config/logger.js");
class KillSwitchService {
    static instance;
    state = {
        global: false,
        agents: new Set(),
        features: new Set(),
        tenants: new Set(),
    };
    constructor() { }
    static getInstance() {
        if (!KillSwitchService.instance) {
            KillSwitchService.instance = new KillSwitchService();
        }
        return KillSwitchService.instance;
    }
    engageGlobalKillSwitch(actor, reason) {
        this.state.global = true;
        logger_js_1.logger.fatal({ actor, reason }, 'GLOBAL KILL SWITCH ENGAGED');
    }
    disengageGlobalKillSwitch(actor, reason) {
        this.state.global = false;
        logger_js_1.logger.info({ actor, reason }, 'Global Kill Switch Disengaged');
    }
    isGlobalKillSwitchActive() {
        return this.state.global;
    }
    killAgent(agentId, actor, reason) {
        this.state.agents.add(agentId);
        logger_js_1.logger.warn({ agentId, actor, reason }, 'Agent Kill Switch Engaged');
    }
    reviveAgent(agentId, actor, reason) {
        this.state.agents.delete(agentId);
        logger_js_1.logger.info({ agentId, actor, reason }, 'Agent Kill Switch Disengaged');
    }
    isAgentKilled(agentId) {
        return this.state.global || this.state.agents.has(agentId);
    }
    killFeature(featureKey, actor, reason) {
        this.state.features.add(featureKey);
        logger_js_1.logger.warn({ featureKey, actor, reason }, 'Feature Kill Switch Engaged');
    }
    reviveFeature(featureKey, actor, reason) {
        this.state.features.delete(featureKey);
        logger_js_1.logger.info({ featureKey, actor, reason }, 'Feature Kill Switch Disengaged');
    }
    isFeatureKilled(featureKey) {
        return this.state.global || this.state.features.has(featureKey);
    }
    killTenant(tenantId, actor, reason) {
        this.state.tenants.add(tenantId);
        logger_js_1.logger.warn({ tenantId, actor, reason }, 'Tenant Kill Switch Engaged');
    }
    reviveTenant(tenantId, actor, reason) {
        this.state.tenants.delete(tenantId);
        logger_js_1.logger.info({ tenantId, actor, reason }, 'Tenant Kill Switch Disengaged');
    }
    isTenantKilled(tenantId) {
        return this.state.global || this.state.tenants.has(tenantId);
    }
    checkSystemHealth(context) {
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
exports.KillSwitchService = KillSwitchService;
exports.killSwitchService = KillSwitchService.getInstance();
