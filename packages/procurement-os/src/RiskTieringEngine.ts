import { differenceInCalendarDays } from "date-fns";
import { DataClassification, IntakeRequest, RiskTier } from "./types";

const HIGH_RISK_DATA: DataClassification[] = ["pii", "phi", "regulated"];

export class RiskTieringEngine {
  constructor(private readonly now: () => Date = () => new Date()) {}

  calculateTier(intake: IntakeRequest): RiskTier {
    if (intake.handlesProductionTraffic || intake.criticality === "customer-impacting") {
      return 0;
    }

    if (this.containsHighRiskData(intake.dataCategories) || intake.apiAccess) {
      return 1;
    }

    if (intake.integrationNeeds.length > 0 || intake.criticality === "core-operations") {
      return 2;
    }

    if (intake.spendEstimate >= 50000 || intake.termMonths >= 12) {
      return 2;
    }

    return 3;
  }

  isExpiringRenewal(intake: IntakeRequest): boolean {
    const daysUntilRenewal = differenceInCalendarDays(new Date(intake.renewalDate), this.now());
    return daysUntilRenewal <= 90;
  }

  private containsHighRiskData(categories: DataClassification[]): boolean {
    return categories.some((category) => HIGH_RISK_DATA.includes(category));
  }
}
