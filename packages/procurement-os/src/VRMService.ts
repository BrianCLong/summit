import { addDays, isAfter } from "date-fns";
import {
  AssessmentEvidence,
  AssessmentType,
  RemediationTask,
  RiskAssessment,
  RiskTier,
} from "./types";

export class VRMService {
  private assessments: Map<string, RiskAssessment> = new Map();

  startAssessment(vendor: string, tier: RiskTier, assessmentType: AssessmentType): RiskAssessment {
    const exitPlanReady = tier <= 1;
    const assessment: RiskAssessment = {
      vendor,
      tier,
      assessmentType,
      evidences: [],
      remediation: [],
      completed: false,
      lastReviewed: new Date(),
      exitPlanReady,
      subprocessorChanges: [],
    };
    this.assessments.set(vendor, assessment);
    return assessment;
  }

  addEvidence(vendor: string, evidence: AssessmentEvidence): void {
    const assessment = this.getAssessment(vendor);
    assessment.evidences.push(evidence);
    assessment.lastReviewed = new Date();
  }

  addRemediation(
    vendor: string,
    task: Omit<RemediationTask, "status" | "escalationLevel">
  ): RemediationTask {
    const assessment = this.getAssessment(vendor);
    const remediation: RemediationTask = { ...task, status: "open", escalationLevel: 0 };
    assessment.remediation.push(remediation);
    return remediation;
  }

  escalateOverdueRemediations(today: Date = new Date()): RemediationTask[] {
    const escalated: RemediationTask[] = [];
    this.assessments.forEach((assessment) => {
      assessment.remediation.forEach((task) => {
        if (task.status !== "closed" && isAfter(today, task.dueDate)) {
          task.escalationLevel += 1;
          task.status = "in_progress";
          escalated.push(task);
        }
      });
    });
    return escalated;
  }

  markCompleted(vendor: string): void {
    const assessment = this.getAssessment(vendor);
    const hasOpenHighSeverity = assessment.remediation.some(
      (task) => task.status !== "closed" && task.severity === "high"
    );
    if (hasOpenHighSeverity) {
      throw new Error("Cannot complete VRM with open high-severity remediation");
    }
    assessment.completed = true;
    assessment.lastReviewed = new Date();
  }

  requireReassessment(vendor: string, incidentDate: Date): void {
    const assessment = this.getAssessment(vendor);
    assessment.completed = false;
    assessment.lastReviewed = incidentDate;
  }

  needsAnnualReassessment(vendor: string, referenceDate: Date = new Date()): boolean {
    const assessment = this.getAssessment(vendor);
    const reviewBy = addDays(assessment.lastReviewed, 365);
    return assessment.tier <= 1 && isAfter(referenceDate, reviewBy);
  }

  recordSubprocessorChange(vendor: string, change: string): void {
    const assessment = this.getAssessment(vendor);
    assessment.subprocessorChanges.push(change);
  }

  private getAssessment(vendor: string): RiskAssessment {
    const assessment = this.assessments.get(vendor);
    if (!assessment) {
      throw new Error(`No assessment found for vendor ${vendor}`);
    }
    return assessment;
  }
}
