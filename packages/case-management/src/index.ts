/**
 * Case Management Package
 * Investigation workflow, alert triage, and case tracking
 */

import { Alert } from '@intelgraph/transaction-monitoring';

export enum CaseStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  INVESTIGATING = 'INVESTIGATING',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum CasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Case {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  alerts: Alert[];
  assignee?: string;
  createdBy: string;
  createdDate: Date;
  updatedDate: Date;
  dueDate?: Date;
  tags: string[];
  evidence: Evidence[];
  timeline: TimelineEvent[];
  decision?: CaseDecision;
}

export interface Evidence {
  id: string;
  type: 'DOCUMENT' | 'TRANSACTION' | 'SCREENSHOT' | 'NOTE' | 'EXTERNAL';
  description: string;
  source: string;
  addedBy: string;
  addedDate: Date;
  metadata: Record<string, any>;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  actor: string;
  action: string;
  details: string;
}

export interface CaseDecision {
  decision: 'SAR_FILED' | 'NO_ACTION' | 'ESCALATED' | 'ONGOING_MONITORING';
  reason: string;
  decidedBy: string;
  decidedDate: Date;
}

export class CaseManager {
  private cases: Map<string, Case> = new Map();

  async createCase(alerts: Alert[], title: string, description: string, createdBy: string): Promise<Case> {
    const priority = this.determinePriority(alerts);

    const case_: Case = {
      id: `CASE_${Date.now()}`,
      title,
      description,
      status: CaseStatus.NEW,
      priority,
      alerts,
      createdBy,
      createdDate: new Date(),
      updatedDate: new Date(),
      tags: [],
      evidence: [],
      timeline: [
        {
          id: `evt_${Date.now()}`,
          timestamp: new Date(),
          actor: createdBy,
          action: 'CASE_CREATED',
          details: `Case created with ${alerts.length} alerts`,
        },
      ],
    };

    this.cases.set(case_.id, case_);
    return case_;
  }

  async assignCase(caseId: string, assignee: string): Promise<Case> {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('Case not found');

    case_.assignee = assignee;
    case_.status = CaseStatus.ASSIGNED;
    case_.updatedDate = new Date();

    case_.timeline.push({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      actor: assignee,
      action: 'CASE_ASSIGNED',
      details: `Case assigned to ${assignee}`,
    });

    return case_;
  }

  async updateStatus(caseId: string, status: CaseStatus, actor: string): Promise<Case> {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('Case not found');

    const oldStatus = case_.status;
    case_.status = status;
    case_.updatedDate = new Date();

    case_.timeline.push({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      actor,
      action: 'STATUS_CHANGED',
      details: `Status changed from ${oldStatus} to ${status}`,
    });

    return case_;
  }

  async addEvidence(caseId: string, evidence: Omit<Evidence, 'id' | 'addedDate'>): Promise<Case> {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('Case not found');

    const fullEvidence: Evidence = {
      ...evidence,
      id: `evd_${Date.now()}`,
      addedDate: new Date(),
    };

    case_.evidence.push(fullEvidence);
    case_.updatedDate = new Date();

    case_.timeline.push({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      actor: evidence.addedBy,
      action: 'EVIDENCE_ADDED',
      details: `Added ${evidence.type}: ${evidence.description}`,
    });

    return case_;
  }

  async resolveCase(caseId: string, decision: CaseDecision): Promise<Case> {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('Case not found');

    case_.decision = decision;
    case_.status = CaseStatus.RESOLVED;
    case_.updatedDate = new Date();

    case_.timeline.push({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      actor: decision.decidedBy,
      action: 'CASE_RESOLVED',
      details: `Case resolved: ${decision.decision} - ${decision.reason}`,
    });

    return case_;
  }

  async getCase(caseId: string): Promise<Case | undefined> {
    return this.cases.get(caseId);
  }

  async getCasesByStatus(status: CaseStatus): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(c => c.status === status);
  }

  async getCasesByAssignee(assignee: string): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(c => c.assignee === assignee);
  }

  async getHighPriorityCases(): Promise<Case[]> {
    return Array.from(this.cases.values())
      .filter(c => c.priority === CasePriority.HIGH || c.priority === CasePriority.CRITICAL)
      .filter(c => c.status !== CaseStatus.CLOSED && c.status !== CaseStatus.RESOLVED)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return this.priorityToNumber(b.priority) - this.priorityToNumber(a.priority);
        }
        return b.createdDate.getTime() - a.createdDate.getTime();
      });
  }

  async triageAlerts(alerts: Alert[]): Promise<TriageResult> {
    const high = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL');
    const medium = alerts.filter(a => a.severity === 'MEDIUM');
    const low = alerts.filter(a => a.severity === 'LOW');

    return {
      highPriority: high,
      mediumPriority: medium,
      lowPriority: low,
      recommendation: high.length > 0 ? 'IMMEDIATE_ACTION' : medium.length > 0 ? 'REVIEW_REQUIRED' : 'MONITOR',
    };
  }

  private determinePriority(alerts: Alert[]): CasePriority {
    const hasCritical = alerts.some(a => a.severity === 'CRITICAL');
    const hasHigh = alerts.some(a => a.severity === 'HIGH');
    const avgScore = alerts.reduce((sum, a) => sum + a.score, 0) / alerts.length;

    if (hasCritical || avgScore > 90) return CasePriority.CRITICAL;
    if (hasHigh || avgScore > 70) return CasePriority.HIGH;
    if (avgScore > 50) return CasePriority.MEDIUM;
    return CasePriority.LOW;
  }

  private priorityToNumber(priority: CasePriority): number {
    switch (priority) {
      case CasePriority.CRITICAL: return 4;
      case CasePriority.HIGH: return 3;
      case CasePriority.MEDIUM: return 2;
      case CasePriority.LOW: return 1;
    }
  }
}

export interface TriageResult {
  highPriority: Alert[];
  mediumPriority: Alert[];
  lowPriority: Alert[];
  recommendation: string;
}

export class InvestigationWorkflow {
  async startInvestigation(caseId: string): Promise<InvestigationPlan> {
    return {
      caseId,
      steps: [
        { id: '1', name: 'Review alerts', status: 'PENDING', dueDate: new Date() },
        { id: '2', name: 'Gather evidence', status: 'PENDING', dueDate: new Date() },
        { id: '3', name: 'Interview parties', status: 'PENDING', dueDate: new Date() },
        { id: '4', name: 'Make decision', status: 'PENDING', dueDate: new Date() },
      ],
      progress: 0,
    };
  }
}

export interface InvestigationPlan {
  caseId: string;
  steps: InvestigationStep[];
  progress: number;
}

export interface InvestigationStep {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: Date;
}
