"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingFactory = void 0;
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const types_1 = require("./types");
const DEFAULT_CONFIG = {
    strategicSlaMinutes: 60,
    growthSlaMinutes: 180,
    longTailSlaMinutes: 360,
};
class OnboardingFactory {
    config;
    onboardings = new Map();
    constructor(config = DEFAULT_CONFIG) {
        this.config = config;
    }
    startIntake(profile) {
        const partnerId = (0, uuid_1.v4)();
        const intake = { ...profile, partnerId };
        const initialSecurity = {
            tier: types_1.PartnerSegment.LONG_TAIL,
            controlsMet: 0,
            controlsTotal: 0,
            failingControls: [],
        };
        const technical = {
            sandboxIssued: false,
            apiKeysIssued: false,
            scopesGranted: [],
            rateLimitPerMinute: 0,
            webhooksConfigured: false,
            replayProtectionEnabled: false,
        };
        const state = {
            intake,
            security: initialSecurity,
            technical,
            certificationStatus: 'pending',
            enablementKitIssued: false,
            portalAccountIssued: false,
            createdAt: new Date(),
        };
        this.onboardings.set(partnerId, state);
        return state;
    }
    applySecurityQuestionnaire(partnerId, result) {
        const state = this.requireState(partnerId);
        const passThreshold = result.controlsTotal === 0 ? 0 : result.controlsMet / result.controlsTotal;
        if (passThreshold < 0.8) {
            throw new Error(`Security questionnaire failed: ${result.failingControls.join(', ')}`);
        }
        const updated = { ...state, security: result };
        this.onboardings.set(partnerId, updated);
        return updated;
    }
    completeTechnicalChecklist(partnerId, checklist) {
        if (!checklist.sandboxIssued || !checklist.apiKeysIssued || !checklist.webhooksConfigured || !checklist.replayProtectionEnabled) {
            throw new Error('Technical onboarding must provision sandbox, keys, webhooks, and replay protection.');
        }
        const state = this.requireState(partnerId);
        const updated = { ...state, technical: checklist };
        this.onboardings.set(partnerId, updated);
        return updated;
    }
    issueEnablement(partnerId) {
        const state = this.requireState(partnerId);
        const updated = { ...state, enablementKitIssued: true, portalAccountIssued: true };
        this.onboardings.set(partnerId, updated);
        return updated;
    }
    markCertification(partnerId, status, achievedAt = new Date()) {
        const state = this.requireState(partnerId);
        if (status === 'passed') {
            return this.markFirstSuccess({ ...state, certificationStatus: 'passed' }, achievedAt);
        }
        const updated = { ...state, certificationStatus: 'failed' };
        this.onboardings.set(partnerId, updated);
        return updated;
    }
    markFirstSuccess(state, at) {
        if (!state.firstSuccessAt) {
            state.firstSuccessAt = at;
        }
        this.onboardings.set(state.intake.partnerId, state);
        return state;
    }
    calculateTargetSla(tier) {
        switch (tier) {
            case types_1.PartnerSegment.STRATEGIC:
                return this.config.strategicSlaMinutes;
            case types_1.PartnerSegment.GROWTH:
                return this.config.growthSlaMinutes;
            default:
                return this.config.longTailSlaMinutes;
        }
    }
    timeToFirstSuccessMinutes(partnerId) {
        const state = this.requireState(partnerId);
        if (!state.firstSuccessAt)
            return undefined;
        return (0, dayjs_1.default)(state.firstSuccessAt).diff((0, dayjs_1.default)(state.createdAt), 'minute');
    }
    requireState(partnerId) {
        const state = this.onboardings.get(partnerId);
        if (!state) {
            throw new Error(`No onboarding state for ${partnerId}`);
        }
        return state;
    }
}
exports.OnboardingFactory = OnboardingFactory;
