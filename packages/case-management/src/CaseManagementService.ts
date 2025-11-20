/**
 * Case Management Service
 * Core service for managing intelligence investigations and cases
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Investigation,
  Evidence,
  Finding,
  Report,
  AuditEntry,
  ChainOfCustodyEntry,
  Note,
  CaseFilter,
  CaseMetrics,
} from './types';

export class CaseManagementService {
  private investigations: Map<string, Investigation> = new Map();

  /**
   * Create a new investigation
   */
  createInvestigation(params: {
    title: string;
    description: string;
    classification: Investigation['classification'];
    priority: Investigation['priority'];
    leadInvestigator: string;
    createdBy: string;
  }): Investigation {
    const investigation: Investigation = {
      id: uuidv4(),
      caseNumber: this.generateCaseNumber(),
      title: params.title,
      description: params.description,
      classification: params.classification,
      status: 'draft',
      priority: params.priority,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      leadInvestigator: params.leadInvestigator,
      analysts: [],
      reviewers: [],
      entities: [],
      relationships: [],
      events: [
        {
          id: uuidv4(),
          type: 'created',
          timestamp: new Date(),
          userId: params.createdBy,
          description: 'Investigation created',
        },
      ],
      evidence: [],
      findings: [],
      hypotheses: [],
      reports: [],
      auditLog: [
        {
          id: uuidv4(),
          timestamp: new Date(),
          userId: params.createdBy,
          userName: 'System', // Would come from user service
          action: 'create',
          resourceType: 'investigation',
          resourceId: '',
        },
      ],
      tags: [],
      notes: [],
    };

    investigation.auditLog[0].resourceId = investigation.id;
    this.investigations.set(investigation.id, investigation);

    return investigation;
  }

  /**
   * Get investigation by ID
   */
  getInvestigation(id: string): Investigation | undefined {
    return this.investigations.get(id);
  }

  /**
   * Update investigation
   */
  updateInvestigation(
    id: string,
    updates: Partial<Investigation>,
    userId: string
  ): Investigation | undefined {
    const investigation = this.investigations.get(id);
    if (!investigation) return undefined;

    const oldStatus = investigation.status;
    const updatedInvestigation = {
      ...investigation,
      ...updates,
      updatedAt: new Date(),
    };

    // Add status change event
    if (updates.status && updates.status !== oldStatus) {
      updatedInvestigation.events.push({
        id: uuidv4(),
        type: 'status_changed',
        timestamp: new Date(),
        userId,
        description: `Status changed from ${oldStatus} to ${updates.status}`,
      });
    }

    // Add audit entry
    const changes = Object.entries(updates).map(([field, newValue]) => ({
      field,
      oldValue: (investigation as any)[field],
      newValue,
    }));

    updatedInvestigation.auditLog.push({
      id: uuidv4(),
      timestamp: new Date(),
      userId,
      userName: 'User', // Would come from user service
      action: 'update',
      resourceType: 'investigation',
      resourceId: id,
      changes,
    });

    this.investigations.set(id, updatedInvestigation);
    return updatedInvestigation;
  }

  /**
   * Add evidence to investigation
   */
  addEvidence(
    investigationId: string,
    params: {
      type: Evidence['type'];
      name: string;
      description?: string;
      fileUrl?: string;
      classification: Evidence['classification'];
      source: string;
      collectedBy: string;
      tags?: string[];
    }
  ): Evidence | undefined {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) return undefined;

    const evidence: Evidence = {
      id: uuidv4(),
      investigationId,
      type: params.type,
      name: params.name,
      description: params.description,
      fileUrl: params.fileUrl,
      classification: params.classification,
      chainOfCustody: [
        {
          id: uuidv4(),
          timestamp: new Date(),
          action: 'collected',
          userId: params.collectedBy,
          userName: 'User', // Would come from user service
          notes: 'Initial collection',
        },
      ],
      tags: params.tags || [],
      source: params.source,
      collectedAt: new Date(),
      collectedBy: params.collectedBy,
      analyzed: false,
    };

    investigation.evidence.push(evidence);
    investigation.events.push({
      id: uuidv4(),
      type: 'evidence_added',
      timestamp: new Date(),
      userId: params.collectedBy,
      description: `Evidence added: ${evidence.name}`,
    });

    investigation.auditLog.push({
      id: uuidv4(),
      timestamp: new Date(),
      userId: params.collectedBy,
      userName: 'User',
      action: 'add_evidence',
      resourceType: 'evidence',
      resourceId: evidence.id,
    });

    this.investigations.set(investigationId, investigation);
    return evidence;
  }

  /**
   * Add chain of custody entry
   */
  addChainOfCustodyEntry(
    investigationId: string,
    evidenceId: string,
    entry: {
      action: ChainOfCustodyEntry['action'];
      userId: string;
      userName: string;
      location?: string;
      notes?: string;
    }
  ): boolean {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) return false;

    const evidence = investigation.evidence.find((e) => e.id === evidenceId);
    if (!evidence) return false;

    const custodyEntry: ChainOfCustodyEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
    };

    evidence.chainOfCustody.push(custodyEntry);
    this.investigations.set(investigationId, investigation);

    return true;
  }

  /**
   * Add finding to investigation
   */
  addFinding(
    investigationId: string,
    params: {
      title: string;
      description: string;
      type: Finding['type'];
      confidence: Finding['confidence'];
      severity: Finding['severity'];
      evidenceIds?: string[];
      discoveredBy: string;
      tags?: string[];
    }
  ): Finding | undefined {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) return undefined;

    const finding: Finding = {
      id: uuidv4(),
      investigationId,
      title: params.title,
      description: params.description,
      type: params.type,
      confidence: params.confidence,
      severity: params.severity,
      evidenceIds: params.evidenceIds || [],
      entityIds: [],
      discoveredAt: new Date(),
      discoveredBy: params.discoveredBy,
      reviewStatus: 'pending',
      tags: params.tags || [],
    };

    investigation.findings.push(finding);
    investigation.events.push({
      id: uuidv4(),
      type: 'finding_added',
      timestamp: new Date(),
      userId: params.discoveredBy,
      description: `Finding added: ${finding.title}`,
    });

    this.investigations.set(investigationId, investigation);
    return finding;
  }

  /**
   * Add note to investigation
   */
  addNote(
    investigationId: string,
    params: {
      content: string;
      type: Note['type'];
      createdBy: string;
      isPrivate?: boolean;
      tags?: string[];
    }
  ): Note | undefined {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) return undefined;

    const note: Note = {
      id: uuidv4(),
      investigationId,
      content: params.content,
      type: params.type,
      createdBy: params.createdBy,
      createdAt: new Date(),
      isPrivate: params.isPrivate || false,
      replies: [],
      tags: params.tags || [],
    };

    investigation.notes.push(note);
    this.investigations.set(investigationId, investigation);

    return note;
  }

  /**
   * Filter and search investigations
   */
  findInvestigations(filter: CaseFilter): Investigation[] {
    let results = Array.from(this.investigations.values());

    if (filter.status && filter.status.length > 0) {
      results = results.filter((inv) => filter.status!.includes(inv.status));
    }

    if (filter.priority && filter.priority.length > 0) {
      results = results.filter((inv) => filter.priority!.includes(inv.priority));
    }

    if (filter.classification && filter.classification.length > 0) {
      results = results.filter((inv) =>
        filter.classification!.includes(inv.classification)
      );
    }

    if (filter.assignedTo && filter.assignedTo.length > 0) {
      results = results.filter(
        (inv) =>
          filter.assignedTo!.includes(inv.leadInvestigator) ||
          inv.analysts.some((a) => filter.assignedTo!.includes(a))
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((inv) =>
        filter.tags!.some((tag) => inv.tags.includes(tag))
      );
    }

    if (filter.dateRange) {
      results = results.filter(
        (inv) =>
          inv.createdAt >= filter.dateRange!.start &&
          inv.createdAt <= filter.dateRange!.end
      );
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      results = results.filter(
        (inv) =>
          inv.title.toLowerCase().includes(query) ||
          inv.description.toLowerCase().includes(query) ||
          inv.caseNumber.toLowerCase().includes(query)
      );
    }

    return results;
  }

  /**
   * Get case metrics
   */
  getMetrics(): CaseMetrics {
    const investigations = Array.from(this.investigations.values());

    const byStatus = investigations.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      },
      {} as Record<Investigation['status'], number>
    );

    const byPriority = investigations.reduce(
      (acc, inv) => {
        acc[inv.priority] = (acc[inv.priority] || 0) + 1;
        return acc;
      },
      {} as Record<Investigation['priority'], number>
    );

    const byClassification = investigations.reduce(
      (acc, inv) => {
        acc[inv.classification] = (acc[inv.classification] || 0) + 1;
        return acc;
      },
      {} as Record<Investigation['classification'], number>
    );

    const closedInvestigations = investigations.filter(
      (inv) => inv.status === 'closed' && inv.closedAt
    );

    const averageResolutionTime =
      closedInvestigations.length > 0
        ? closedInvestigations.reduce((sum, inv) => {
            const duration = inv.closedAt!.getTime() - inv.createdAt.getTime();
            return sum + duration;
          }, 0) / closedInvestigations.length
        : 0;

    return {
      total: investigations.length,
      active: investigations.filter((inv) => inv.status === 'active').length,
      closed: investigations.filter((inv) => inv.status === 'closed').length,
      criticalPriority: investigations.filter((inv) => inv.priority === 'critical')
        .length,
      averageResolutionTime,
      byStatus,
      byPriority,
      byClassification,
    };
  }

  /**
   * Generate a unique case number
   */
  private generateCaseNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = String(this.investigations.size + 1).padStart(4, '0');
    return `CASE-${year}${month}-${sequence}`;
  }
}

export const caseManagementService = new CaseManagementService();
