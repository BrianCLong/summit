import { IntakeValidator } from "./IntakeValidator";
import { RiskTieringEngine } from "./RiskTieringEngine";
import { SpendGate } from "./SpendGate";
import { WorkflowRouter } from "./WorkflowRouter";
import { VRMService } from "./VRMService";
import { ExceptionRegistry } from "./ExceptionRegistry";
import { RenewalCalendar } from "./RenewalCalendar";
import { ScorecardService } from "./ScorecardService";
import {
  CatalogEntry,
  IntakeDecision,
  IntakeRequest,
  PaymentDecision,
  PaymentRequest,
  VendorScorecard,
} from "./types";

export class ProcurementEngine {
  private validator = new IntakeValidator();
  private tiering = new RiskTieringEngine();
  private spendGate = new SpendGate();
  private router = new WorkflowRouter();
  private vrm = new VRMService();
  private exceptions = new ExceptionRegistry();
  private renewals = new RenewalCalendar();
  private scorecards = new ScorecardService();
  private catalog: Map<string, CatalogEntry> = new Map();

  createIntake(intake: Partial<IntakeRequest>): IntakeDecision {
    const validated = this.validator.validate(intake);
    const riskTier = this.tiering.calculateTier(validated);
    const approvalPath = this.spendGate.evaluate(validated, riskTier);
    const routing = this.router.route(validated, approvalPath, riskTier);
    const policyViolations = this.checkPolicyViolations(validated);

    if (this.tiering.isExpiringRenewal(validated)) {
      this.renewals.addEvent({
        vendor: validated.vendorName,
        renewalDate: new Date(validated.renewalDate),
        noticeDate: new Date(validated.noticeDate),
        negotiationWindowStart: new Date(
          new Date(validated.noticeDate).getTime() - 14 * 24 * 60 * 60 * 1000
        ),
        owner: validated.owner,
        autoRenew: validated.termMonths >= 12,
      });
    }

    return { riskTier, approvalPath, routing, policyViolations };
  }

  startVRM(vendor: string, tier: number): void {
    const assessmentType = tier === 0 ? "deep" : tier === 1 ? "standard" : "lite";
    this.vrm.startAssessment(vendor, tier as 0 | 1 | 2 | 3, assessmentType);
  }

  evaluatePayment(request: PaymentRequest): PaymentDecision {
    if (!request.purchaseOrder) {
      if (!request.exceptionId || !this.exceptions.isValid(request.exceptionId)) {
        return { approved: false, reason: "No PO/no pay enforced and no valid exception" };
      }
    }
    return { approved: true };
  }

  registerException(entry: Parameters<ExceptionRegistry["register"]>[0]): void {
    this.exceptions.register(entry);
  }

  addCatalogEntry(entry: CatalogEntry): void {
    if (entry.keepKill === "delete" && entry.blockedShadow === false) {
      throw new Error("Deletion candidates must block shadow vendors");
    }
    this.catalog.set(entry.vendor, entry);
  }

  enforceOverlapPolicy(newEntry: CatalogEntry): void {
    if (newEntry.overlapCategory) {
      const overlapping = Array.from(this.catalog.values()).filter(
        (entry) =>
          entry.overlapCategory === newEntry.overlapCategory && entry.vendor !== newEntry.vendor
      );
      overlapping.forEach((entry) => {
        if (entry.keepKill !== "delete") {
          entry.keepKill = "delete";
          entry.blockedShadow = true;
          this.catalog.set(entry.vendor, entry);
        }
      });
    }
    this.addCatalogEntry(newEntry);
  }

  buildScorecard(
    vendor: string,
    metrics: Omit<VendorScorecard, "vendor" | "score" | "renewalRecommendation">
  ): VendorScorecard {
    return this.scorecards.buildScorecard(vendor, metrics);
  }

  getRenewalsDue(days: number): ReturnType<RenewalCalendar["dueWithin"]> {
    return this.renewals.dueWithin(days);
  }

  getNegotiationWindows(): ReturnType<RenewalCalendar["negotiationWindows"]> {
    return this.renewals.negotiationWindows();
  }

  getVRMService(): VRMService {
    return this.vrm;
  }

  private checkPolicyViolations(intake: IntakeRequest): string[] {
    const violations: string[] = [];
    if (!intake.hasSSO) {
      violations.push("SSO missing; must be configured before go-live");
    }
    if (!intake.preferredVendor) {
      violations.push("Non-preferred vendor requires approved exception");
    }
    if (intake.existingOverlapCategory) {
      violations.push("Overlapping category requires decommissioning plan");
    }
    if (intake.seatsRequested > intake.estimatedUsers) {
      violations.push("Seat request exceeds estimated users; enforce seat hygiene");
    }
    return violations;
  }
}
