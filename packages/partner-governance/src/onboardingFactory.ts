import { v4 as uuid } from "uuid";
import dayjs from "dayjs";
import {
  IntakeProfile,
  OnboardingState,
  PartnerSegment,
  SecurityQuestionnaireResult,
  TechnicalOnboardingChecklist,
} from "./types";

interface OnboardingConfig {
  strategicSlaMinutes: number;
  growthSlaMinutes: number;
  longTailSlaMinutes: number;
}

const DEFAULT_CONFIG: OnboardingConfig = {
  strategicSlaMinutes: 60,
  growthSlaMinutes: 180,
  longTailSlaMinutes: 360,
};

export class OnboardingFactory {
  private onboardings: Map<string, OnboardingState> = new Map();
  constructor(private readonly config: OnboardingConfig = DEFAULT_CONFIG) {}

  startIntake(profile: Omit<IntakeProfile, "partnerId">): OnboardingState {
    const partnerId = uuid();
    const intake: IntakeProfile = { ...profile, partnerId };
    const initialSecurity: SecurityQuestionnaireResult = {
      tier: PartnerSegment.LONG_TAIL,
      controlsMet: 0,
      controlsTotal: 0,
      failingControls: [],
    };
    const technical: TechnicalOnboardingChecklist = {
      sandboxIssued: false,
      apiKeysIssued: false,
      scopesGranted: [],
      rateLimitPerMinute: 0,
      webhooksConfigured: false,
      replayProtectionEnabled: false,
    };

    const state: OnboardingState = {
      intake,
      security: initialSecurity,
      technical,
      certificationStatus: "pending",
      enablementKitIssued: false,
      portalAccountIssued: false,
      createdAt: new Date(),
    };
    this.onboardings.set(partnerId, state);
    return state;
  }

  applySecurityQuestionnaire(
    partnerId: string,
    result: SecurityQuestionnaireResult
  ): OnboardingState {
    const state = this.requireState(partnerId);
    const passThreshold =
      result.controlsTotal === 0 ? 0 : result.controlsMet / result.controlsTotal;
    if (passThreshold < 0.8) {
      throw new Error(`Security questionnaire failed: ${result.failingControls.join(", ")}`);
    }
    const updated = { ...state, security: result };
    this.onboardings.set(partnerId, updated);
    return updated;
  }

  completeTechnicalChecklist(
    partnerId: string,
    checklist: TechnicalOnboardingChecklist
  ): OnboardingState {
    if (
      !checklist.sandboxIssued ||
      !checklist.apiKeysIssued ||
      !checklist.webhooksConfigured ||
      !checklist.replayProtectionEnabled
    ) {
      throw new Error(
        "Technical onboarding must provision sandbox, keys, webhooks, and replay protection."
      );
    }
    const state = this.requireState(partnerId);
    const updated: OnboardingState = { ...state, technical: checklist };
    this.onboardings.set(partnerId, updated);
    return updated;
  }

  issueEnablement(partnerId: string): OnboardingState {
    const state = this.requireState(partnerId);
    const updated = { ...state, enablementKitIssued: true, portalAccountIssued: true };
    this.onboardings.set(partnerId, updated);
    return updated;
  }

  markCertification(
    partnerId: string,
    status: "passed" | "failed",
    achievedAt = new Date()
  ): OnboardingState {
    const state = this.requireState(partnerId);
    if (status === "passed") {
      return this.markFirstSuccess({ ...state, certificationStatus: "passed" }, achievedAt);
    }
    const updated: OnboardingState = { ...state, certificationStatus: "failed" };
    this.onboardings.set(partnerId, updated);
    return updated;
  }

  private markFirstSuccess(state: OnboardingState, at: Date): OnboardingState {
    if (!state.firstSuccessAt) {
      state.firstSuccessAt = at;
    }
    this.onboardings.set(state.intake.partnerId, state);
    return state;
  }

  calculateTargetSla(tier: PartnerSegment): number {
    switch (tier) {
      case PartnerSegment.STRATEGIC:
        return this.config.strategicSlaMinutes;
      case PartnerSegment.GROWTH:
        return this.config.growthSlaMinutes;
      default:
        return this.config.longTailSlaMinutes;
    }
  }

  timeToFirstSuccessMinutes(partnerId: string): number | undefined {
    const state = this.requireState(partnerId);
    if (!state.firstSuccessAt) return undefined;
    return dayjs(state.firstSuccessAt).diff(dayjs(state.createdAt), "minute");
  }

  private requireState(partnerId: string): OnboardingState {
    const state = this.onboardings.get(partnerId);
    if (!state) {
      throw new Error(`No onboarding state for ${partnerId}`);
    }
    return state;
  }
}
