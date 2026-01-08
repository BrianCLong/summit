import { ApprovalRequirement, IntakeRequest, RiskTier } from "./types";

interface SpendThresholds {
  manager: number;
  director: number;
  vp: number;
  cfo: number;
}

const DEFAULT_THRESHOLDS: SpendThresholds = {
  manager: 10000,
  director: 25000,
  vp: 50000,
  cfo: 100000,
};

export class SpendGate {
  constructor(private readonly thresholds: SpendThresholds = DEFAULT_THRESHOLDS) {}

  evaluate(intake: IntakeRequest, riskTier: RiskTier): ApprovalRequirement {
    const approvers: string[] = ["manager"];

    if (intake.spendEstimate >= this.thresholds.manager) {
      approvers.push("director");
    }
    if (intake.spendEstimate >= this.thresholds.director) {
      approvers.push("vp");
    }
    if (intake.spendEstimate >= this.thresholds.vp) {
      approvers.push("cfo");
    }

    const requiresExecutiveSignoff = riskTier === 0 || intake.spendEstimate >= this.thresholds.cfo;

    return {
      spendGate: approvers,
      requiresExecutiveSignoff,
      requiresSecurity: riskTier <= 2,
      requiresLegal: true,
      requiresFinance: true,
      requiresIT: true,
    };
  }
}
