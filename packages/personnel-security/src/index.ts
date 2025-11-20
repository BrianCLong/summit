/**
 * Personnel Security Package
 *
 * Security clearance management, background investigations, and continuous evaluation
 */

import { z } from 'zod';

// Security clearance levels
export enum ClearanceLevel {
  TOP_SECRET = 'TOP_SECRET',
  SECRET = 'SECRET',
  CONFIDENTIAL = 'CONFIDENTIAL',
  PUBLIC_TRUST = 'PUBLIC_TRUST',
  NONE = 'NONE'
}

// Background investigation
export const BackgroundInvestigationSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  investigationType: z.enum([
    'INITIAL',
    'PERIODIC_REINVESTIGATION',
    'TRIGGERED',
    'CONTINUOUS_EVALUATION'
  ]),
  clearanceLevel: z.nativeEnum(ClearanceLevel),
  initiatedDate: z.date(),
  completedDate: z.date().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'SUSPENDED', 'CANCELLED']),
  investigator: z.string(),
  areasInvestigated: z.object({
    employment: z.boolean(),
    education: z.boolean(),
    criminal: z.boolean(),
    financial: z.boolean(),
    foreign: z.boolean(),
    references: z.boolean(),
    psychological: z.boolean()
  }),
  findings: z.array(z.object({
    category: z.string(),
    finding: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    mitigated: z.boolean()
  })),
  recommendation: z.enum(['APPROVE', 'CONDITIONAL', 'DENY', 'FURTHER_INVESTIGATION'])
});

export type BackgroundInvestigation = z.infer<typeof BackgroundInvestigationSchema>;

// Security clearance record
export const SecurityClearanceSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  clearanceLevel: z.nativeEnum(ClearanceLevel),
  grantedDate: z.date(),
  expirationDate: z.date(),
  lastReinvestigation: z.date().optional(),
  nextReinvestigation: z.date(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED']),
  specialAccess: z.array(z.object({
    program: z.string(),
    grantedDate: z.date(),
    active: z.boolean()
  })),
  restrictions: z.array(z.string()),
  adjudicationAuthority: z.string(),
  continuousEvaluation: z.boolean()
});

export type SecurityClearance = z.infer<typeof SecurityClearanceSchema>;

// Foreign contact report
export const ForeignContactReportSchema = z.object({
  id: z.string().uuid(),
  reporterId: z.string(),
  reportDate: z.date(),
  contactDate: z.date(),
  contactName: z.string(),
  contactNationality: z.string(),
  contactOrganization: z.string().optional(),
  relationshipType: z.enum([
    'FAMILY',
    'FRIEND',
    'PROFESSIONAL',
    'ROMANTIC',
    'BUSINESS',
    'ACADEMIC',
    'CASUAL'
  ]),
  frequency: z.enum(['ONE_TIME', 'OCCASIONAL', 'REGULAR', 'FREQUENT']),
  natureOfContact: z.string(),
  informationDiscussed: z.string(),
  securityConcern: z.boolean(),
  reviewStatus: z.enum(['PENDING', 'REVIEWED', 'FLAGGED', 'CLEARED']),
  reviewedBy: z.string().optional(),
  notes: z.string().optional()
});

export type ForeignContactReport = z.infer<typeof ForeignContactReportSchema>;

// Foreign travel briefing/debriefing
export const TravelSecuritySchema = z.object({
  id: z.string().uuid(),
  travelerId: z.string(),
  destination: z.string(),
  country: z.string(),
  departureDate: z.date(),
  returnDate: z.date(),
  purpose: z.enum(['OFFICIAL', 'PERSONAL', 'BUSINESS', 'CONFERENCE', 'TRAINING']),
  threatLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  briefing: z.object({
    completed: z.boolean(),
    date: z.date().optional(),
    briefer: z.string().optional(),
    topics: z.array(z.string())
  }),
  debriefing: z.object({
    completed: z.boolean(),
    date: z.date().optional(),
    debriefer: z.string().optional(),
    incidents: z.array(z.object({
      type: z.string(),
      description: z.string(),
      severity: z.string()
    })),
    followupRequired: z.boolean()
  }),
  securityIncidents: z.array(z.string())
});

export type TravelSecurity = z.infer<typeof TravelSecuritySchema>;

// Continuous evaluation program
export const ContinuousEvaluationSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  enrolledDate: z.date(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED']),
  monitoredSources: z.array(z.enum([
    'CRIMINAL_RECORDS',
    'FINANCIAL_RECORDS',
    'FOREIGN_TRAVEL',
    'FOREIGN_CONTACTS',
    'INSIDER_THREAT',
    'SECURITY_VIOLATIONS'
  ])),
  alerts: z.array(z.object({
    id: z.string(),
    date: z.date(),
    source: z.string(),
    alertType: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string(),
    reviewed: z.boolean(),
    actionTaken: z.string().optional()
  })),
  lastReview: z.date(),
  nextReview: z.date()
});

export type ContinuousEvaluation = z.infer<typeof ContinuousEvaluationSchema>;

/**
 * Clearance Adjudication Manager
 */
export class ClearanceAdjudicationManager {
  private clearances: Map<string, SecurityClearance> = new Map();
  private investigations: Map<string, BackgroundInvestigation> = new Map();

  /**
   * Initiate background investigation
   */
  initiateInvestigation(subjectId: string, clearanceLevel: ClearanceLevel): BackgroundInvestigation {
    const investigation: BackgroundInvestigation = {
      id: crypto.randomUUID(),
      subjectId,
      investigationType: 'INITIAL',
      clearanceLevel,
      initiatedDate: new Date(),
      status: 'IN_PROGRESS',
      investigator: 'AUTO_ASSIGNED',
      areasInvestigated: {
        employment: false,
        education: false,
        criminal: false,
        financial: false,
        foreign: false,
        references: false,
        psychological: false
      },
      findings: [],
      recommendation: 'FURTHER_INVESTIGATION'
    };

    this.investigations.set(investigation.id, investigation);
    return investigation;
  }

  /**
   * Adjudicate clearance based on investigation
   */
  adjudicateClearance(investigationId: string): SecurityClearance | null {
    const investigation = this.investigations.get(investigationId);
    if (!investigation || investigation.status !== 'COMPLETED') {
      return null;
    }

    if (investigation.recommendation === 'APPROVE') {
      const clearance: SecurityClearance = {
        id: crypto.randomUUID(),
        subjectId: investigation.subjectId,
        clearanceLevel: investigation.clearanceLevel,
        grantedDate: new Date(),
        expirationDate: this.calculateExpirationDate(investigation.clearanceLevel),
        nextReinvestigation: this.calculateReinvestigationDate(investigation.clearanceLevel),
        status: 'ACTIVE',
        specialAccess: [],
        restrictions: [],
        adjudicationAuthority: 'AUTO_ADJUDICATION',
        continuousEvaluation: true
      };

      this.clearances.set(clearance.id, clearance);
      return clearance;
    }

    return null;
  }

  /**
   * Suspend clearance
   */
  suspendClearance(clearanceId: string, reason: string): boolean {
    const clearance = this.clearances.get(clearanceId);
    if (!clearance) return false;

    clearance.status = 'SUSPENDED';
    clearance.restrictions.push(`SUSPENDED: ${reason}`);
    return true;
  }

  /**
   * Revoke clearance
   */
  revokeClearance(clearanceId: string, reason: string): boolean {
    const clearance = this.clearances.get(clearanceId);
    if (!clearance) return false;

    clearance.status = 'REVOKED';
    clearance.restrictions.push(`REVOKED: ${reason}`);
    return true;
  }

  private calculateExpirationDate(level: ClearanceLevel): Date {
    const now = new Date();
    const years = level === ClearanceLevel.TOP_SECRET ? 5 : 10;
    return new Date(now.setFullYear(now.getFullYear() + years));
  }

  private calculateReinvestigationDate(level: ClearanceLevel): Date {
    const now = new Date();
    const years = level === ClearanceLevel.TOP_SECRET ? 5 : 10;
    return new Date(now.setFullYear(now.getFullYear() + years));
  }

  getClearance(subjectId: string): SecurityClearance | null {
    return Array.from(this.clearances.values()).find(c => c.subjectId === subjectId) || null;
  }
}

/**
 * Foreign Contact Manager
 */
export class ForeignContactManager {
  private reports: Map<string, ForeignContactReport> = new Map();

  submitReport(report: Omit<ForeignContactReport, 'id'>): ForeignContactReport {
    const newReport: ForeignContactReport = {
      ...report,
      id: crypto.randomUUID()
    };

    this.reports.set(newReport.id, newReport);
    return newReport;
  }

  reviewReport(reportId: string, reviewer: string, flagged: boolean): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;

    report.reviewStatus = flagged ? 'FLAGGED' : 'CLEARED';
    report.reviewedBy = reviewer;
    return true;
  }

  getReports(status?: string): ForeignContactReport[] {
    const all = Array.from(this.reports.values());
    if (status) {
      return all.filter(r => r.reviewStatus === status);
    }
    return all;
  }
}

export * from './index.js';
