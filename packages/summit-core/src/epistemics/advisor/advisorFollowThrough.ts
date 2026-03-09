import type { ServedRecommendation } from "./advisorTypes";
import type { DoctrineAlertRemediation } from "../alerts/alertTypes";
import { stableId } from "../../util/stableId";

export function prefillRemediationFromRecommendation(
  alertId: string,
  recommendation: ServedRecommendation,
  actor: { id: string; kind: "user" | "agent" | "system" }
): Omit<DoctrineAlertRemediation, "remediation_id" | "chosen_at"> {
  return {
    chosen_by: actor,
    action_type: recommendation.action_type,
    summary: `Accepted doctrine advisor recommendation (rank ${recommendation.rank}, confidence: ${recommendation.confidence}). Rationale: ${recommendation.rationale}`,
  };
}

export function buildAdvisorAcceptedRemediation(
  alertId: string,
  recommendation: ServedRecommendation,
  actor: { id: string; kind: "user" | "agent" | "system" }
): DoctrineAlertRemediation {
  return {
    remediation_id: stableId("rem", `${alertId}:${recommendation.action_type}:${Date.now()}`),
    chosen_at: new Date().toISOString(),
    ...prefillRemediationFromRecommendation(alertId, recommendation, actor),
  };
}
