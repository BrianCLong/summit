import { Alert, ExpansionTrigger, PlaybookAction, TenantProfile } from "./types";

export interface ExpansionSignals {
  seatsUsed: number;
  seatLimit: number;
  advancedFeaturesUsed: string[];
  newTeamsInvited: number;
  invoicesOverLimit: boolean;
}

export function detectExpansionTriggers(signals: ExpansionSignals): ExpansionTrigger[] {
  const triggers: ExpansionTrigger[] = [];
  const utilization = signals.seatsUsed / signals.seatLimit;
  if (utilization >= 0.8) {
    triggers.push({
      trigger: "seat-capacity",
      detectedAt: new Date(),
      recommendedPath: "Offer in-app seat expansion with pricing clarity",
    });
  }
  if (signals.advancedFeaturesUsed.length) {
    triggers.push({
      trigger: "advanced-feature",
      detectedAt: new Date(),
      recommendedPath: `Upsell advanced modules: ${signals.advancedFeaturesUsed.join(", ")}`,
    });
  }
  if (signals.newTeamsInvited > 0) {
    triggers.push({
      trigger: "new-teams",
      detectedAt: new Date(),
      recommendedPath: "Provide multi-team collaboration onboarding and SCIM/SSO rollout",
    });
  }
  if (signals.invoicesOverLimit) {
    triggers.push({
      trigger: "overage",
      detectedAt: new Date(),
      recommendedPath: "Align on contract expansion to cover overage and forecast growth",
    });
  }
  return triggers;
}

export function expansionPlaybookFromAlerts(
  alerts: Alert[],
  profile: TenantProfile
): PlaybookAction[] {
  const opportunities = alerts.filter((alert) => alert.kind === "expansion-opportunity");
  return opportunities.map((alert) => ({
    id: `${profile.id}-expansion-${alert.occurredAt.getTime()}`,
    category: "expansion",
    description: alert.recommendedPlaybook,
    requiresApproval: false,
  }));
}
