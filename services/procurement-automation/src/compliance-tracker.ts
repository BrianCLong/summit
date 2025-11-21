import { v4 as uuidv4 } from 'uuid';
import {
  ATOStatus,
  ComplianceControl,
  ProcurementFramework,
  ProcurementRequest,
  ATOPackage,
} from './types.js';
import { ParsedRequirements, RequirementsParser } from './requirements-parser.js';

/**
 * Compliance milestone
 */
export interface ComplianceMilestone {
  id: string;
  name: string;
  description: string;
  dueDate?: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
  deliverables: string[];
  owner: string;
}

/**
 * Compliance dashboard metrics
 */
export interface ComplianceDashboard {
  overallProgress: number;
  controlsImplemented: number;
  controlsTotal: number;
  documentsComplete: number;
  documentsTotal: number;
  riskScore: number;
  estimatedCompletionDate: Date;
  blockers: string[];
  nextMilestone: ComplianceMilestone | null;
  byFramework: Record<ProcurementFramework, {
    progress: number;
    status: ATOStatus;
  }>;
}

/**
 * Timeline entry for Gantt chart
 */
export interface TimelineEntry {
  id: string;
  task: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  dependencies: string[];
  critical: boolean;
}

/**
 * ComplianceTracker - Tracks compliance progress and generates dashboards
 */
export class ComplianceTracker {
  private requests: Map<string, ProcurementRequest> = new Map();
  private packages: Map<string, ATOPackage> = new Map();
  private milestones: Map<string, ComplianceMilestone[]> = new Map();
  private parser: RequirementsParser;

  constructor() {
    this.parser = new RequirementsParser();
  }

  /**
   * Create a new procurement request
   */
  createRequest(input: {
    title: string;
    description: string;
    requestor: ProcurementRequest['requestor'];
    frameworks: ProcurementFramework[];
    dataClassification: ProcurementRequest['dataClassification'];
    systemBoundary: ProcurementRequest['systemBoundary'];
    urgency?: 'standard' | 'expedited' | 'emergency';
    targetAtoDate?: Date;
  }): ProcurementRequest {
    const request: ProcurementRequest = {
      id: uuidv4(),
      title: input.title,
      description: input.description,
      requestor: input.requestor,
      targetFrameworks: input.frameworks,
      dataClassification: input.dataClassification,
      systemBoundary: input.systemBoundary,
      timeline: {
        submittedAt: new Date(),
        targetAtoDate: input.targetAtoDate,
        urgency: input.urgency || 'standard',
      },
      status: 'not_started',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.requests.set(request.id, request);
    this.initializeMilestones(request);

    return request;
  }

  /**
   * Initialize milestones for a request
   */
  private initializeMilestones(request: ProcurementRequest): void {
    const baseMilestones: Omit<ComplianceMilestone, 'id'>[] = [
      {
        name: 'Requirements Analysis',
        description: 'Parse and analyze compliance requirements',
        status: 'pending',
        dependencies: [],
        deliverables: ['Requirements document', 'Gap analysis'],
        owner: request.requestor.email,
      },
      {
        name: 'System Security Plan Draft',
        description: 'Complete initial SSP documentation',
        status: 'pending',
        dependencies: ['Requirements Analysis'],
        deliverables: ['SSP v1.0'],
        owner: request.requestor.email,
      },
      {
        name: 'Control Implementation',
        description: 'Implement required security controls',
        status: 'pending',
        dependencies: ['System Security Plan Draft'],
        deliverables: ['Control evidence', 'Implementation narratives'],
        owner: request.requestor.email,
      },
      {
        name: 'SBOM Generation',
        description: 'Generate software bill of materials',
        status: 'pending',
        dependencies: [],
        deliverables: ['SBOM (CycloneDX/SPDX)', 'Vulnerability report'],
        owner: request.requestor.email,
      },
      {
        name: 'Security Assessment',
        description: 'Third-party security assessment',
        status: 'pending',
        dependencies: ['Control Implementation'],
        deliverables: ['SAR', 'POA&M'],
        owner: request.requestor.email,
      },
      {
        name: 'ATO Package Submission',
        description: 'Submit complete ATO package for review',
        status: 'pending',
        dependencies: ['Security Assessment', 'SBOM Generation'],
        deliverables: ['ATO package'],
        owner: request.requestor.email,
      },
      {
        name: 'Authorization Decision',
        description: 'Receive ATO decision from authorizing official',
        status: 'pending',
        dependencies: ['ATO Package Submission'],
        deliverables: ['ATO letter'],
        owner: request.requestor.email,
      },
    ];

    const milestones: ComplianceMilestone[] = baseMilestones.map((m, i) => ({
      ...m,
      id: `${request.id}-ms-${i + 1}`,
    }));

    this.milestones.set(request.id, milestones);
  }

  /**
   * Get request by ID
   */
  getRequest(id: string): ProcurementRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * List all requests
   */
  listRequests(): ProcurementRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * Update request status
   */
  updateRequestStatus(requestId: string, status: ATOStatus): void {
    const request = this.requests.get(requestId);
    if (request) {
      request.status = status;
      request.updatedAt = new Date();
    }
  }

  /**
   * Get milestones for a request
   */
  getMilestones(requestId: string): ComplianceMilestone[] {
    return this.milestones.get(requestId) || [];
  }

  /**
   * Update milestone status
   */
  updateMilestone(
    requestId: string,
    milestoneId: string,
    update: Partial<ComplianceMilestone>,
  ): void {
    const milestones = this.milestones.get(requestId);
    if (milestones) {
      const index = milestones.findIndex((m) => m.id === milestoneId);
      if (index >= 0) {
        milestones[index] = { ...milestones[index], ...update };
        if (update.status === 'completed' && !milestones[index].completedDate) {
          milestones[index].completedDate = new Date();
        }
      }
    }
  }

  /**
   * Generate compliance dashboard
   */
  generateDashboard(requestId: string): ComplianceDashboard {
    const request = this.requests.get(requestId);
    const milestones = this.getMilestones(requestId);
    const pkg = this.packages.get(requestId);

    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    const completedMilestones = milestones.filter(
      (m) => m.status === 'completed',
    ).length;
    const totalMilestones = milestones.length;

    const controlsImplemented = pkg?.controls.filter(
      (c) => c.status === 'implemented' || c.status === 'assessed',
    ).length || 0;
    const controlsTotal = pkg?.controls.length || 0;

    const documentsComplete = pkg?.documents.filter(
      (d) => d.status === 'approved',
    ).length || 0;
    const documentsTotal = pkg?.documents.length || 0;

    const blockers = milestones
      .filter((m) => m.status === 'blocked')
      .map((m) => m.name);

    const nextMilestone = milestones.find(
      (m) => m.status === 'pending' || m.status === 'in_progress',
    ) || null;

    // Calculate overall progress
    const overallProgress = Math.round(
      ((completedMilestones / totalMilestones) * 0.4 +
        (controlsImplemented / Math.max(controlsTotal, 1)) * 0.4 +
        (documentsComplete / Math.max(documentsTotal, 1)) * 0.2) *
        100,
    );

    // Estimate completion date
    const requirements = this.parser.parseStructuredRequirements({
      frameworks: request.targetFrameworks,
      dataClassification: request.dataClassification,
    });
    const estimatedDays = requirements.estimatedTimelineDays;
    const estimatedCompletionDate = new Date(
      request.createdAt.getTime() + estimatedDays * 24 * 60 * 60 * 1000,
    );

    // Build by-framework breakdown
    const byFramework: ComplianceDashboard['byFramework'] = {} as ComplianceDashboard['byFramework'];
    for (const framework of request.targetFrameworks) {
      byFramework[framework] = {
        progress: overallProgress,
        status: request.status,
      };
    }

    return {
      overallProgress,
      controlsImplemented,
      controlsTotal,
      documentsComplete,
      documentsTotal,
      riskScore: pkg?.riskScore || 50,
      estimatedCompletionDate,
      blockers,
      nextMilestone,
      byFramework,
    };
  }

  /**
   * Generate timeline for Gantt chart
   */
  generateTimeline(requestId: string): TimelineEntry[] {
    const milestones = this.getMilestones(requestId);
    const request = this.requests.get(requestId);

    if (!request) return [];

    const startDate = request.createdAt;
    let currentDate = new Date(startDate);

    const timeline: TimelineEntry[] = [];
    const durations: Record<string, number> = {
      'Requirements Analysis': 14,
      'System Security Plan Draft': 30,
      'Control Implementation': 60,
      'SBOM Generation': 7,
      'Security Assessment': 30,
      'ATO Package Submission': 14,
      'Authorization Decision': 30,
    };

    for (const milestone of milestones) {
      const duration = durations[milestone.name] || 14;
      const taskStart = new Date(currentDate);
      const taskEnd = new Date(
        currentDate.getTime() + duration * 24 * 60 * 60 * 1000,
      );

      timeline.push({
        id: milestone.id,
        task: milestone.name,
        startDate: taskStart,
        endDate: taskEnd,
        progress:
          milestone.status === 'completed'
            ? 100
            : milestone.status === 'in_progress'
              ? 50
              : 0,
        dependencies: milestone.dependencies,
        critical: ['Control Implementation', 'Security Assessment'].includes(
          milestone.name,
        ),
      });

      // Only advance for sequential tasks
      if (!milestone.dependencies.includes('SBOM Generation')) {
        currentDate = taskEnd;
      }
    }

    return timeline;
  }

  /**
   * Generate checklist for a framework
   */
  generateChecklist(framework: ProcurementFramework): {
    category: string;
    items: { id: string; task: string; required: boolean; completed: boolean }[];
  }[] {
    const requirements = this.parser.parseStructuredRequirements({
      frameworks: [framework],
    });

    const checklist = [
      {
        category: 'Documentation',
        items: requirements.requiredDocuments.map((doc, i) => ({
          id: `doc-${i}`,
          task: `Complete ${doc}`,
          required: true,
          completed: false,
        })),
      },
      {
        category: 'Control Families',
        items: requirements.gapAnalysis.map((gap) => ({
          id: `cf-${gap.family}`,
          task: `Implement ${gap.familyName} (${gap.family}) controls`,
          required: gap.required,
          completed: false,
        })),
      },
      {
        category: 'Technical Requirements',
        items: [
          { id: 'tech-sbom', task: 'Generate SBOM', required: true, completed: false },
          { id: 'tech-vuln', task: 'Complete vulnerability scan', required: true, completed: false },
          { id: 'tech-fips', task: 'Validate FIPS compliance', required: requirements.riskLevel === 'high', completed: false },
          { id: 'tech-pen', task: 'Complete penetration test', required: requirements.riskLevel === 'high', completed: false },
        ],
      },
      {
        category: 'Administrative',
        items: [
          { id: 'admin-contacts', task: 'Identify key contacts', required: true, completed: false },
          { id: 'admin-boundary', task: 'Define system boundary', required: true, completed: false },
          { id: 'admin-categorization', task: 'Complete FIPS 199 categorization', required: true, completed: false },
          { id: 'admin-3pao', task: 'Engage 3PAO (if required)', required: framework.includes('FedRAMP'), completed: false },
        ],
      },
    ];

    return checklist;
  }

  /**
   * Link an ATO package to a request
   */
  linkPackage(requestId: string, pkg: ATOPackage): void {
    this.packages.set(requestId, pkg);
  }

  /**
   * Get linked package
   */
  getPackage(requestId: string): ATOPackage | undefined {
    return this.packages.get(requestId);
  }

  /**
   * Export compliance status report
   */
  exportStatusReport(requestId: string): string {
    const dashboard = this.generateDashboard(requestId);
    const request = this.requests.get(requestId)!;
    const milestones = this.getMilestones(requestId);

    return `# Compliance Status Report
## ${request.title}

**Date:** ${new Date().toISOString().split('T')[0]}
**Requestor:** ${request.requestor.name}
**Status:** ${request.status}

---

## Progress Summary

| Metric | Value |
|--------|-------|
| Overall Progress | ${dashboard.overallProgress}% |
| Controls Implemented | ${dashboard.controlsImplemented}/${dashboard.controlsTotal} |
| Documents Complete | ${dashboard.documentsComplete}/${dashboard.documentsTotal} |
| Risk Score | ${dashboard.riskScore}/100 |
| Est. Completion | ${dashboard.estimatedCompletionDate.toISOString().split('T')[0]} |

## Target Frameworks
${request.targetFrameworks.map((f) => `- ${f}`).join('\n')}

## Milestone Status

| Milestone | Status |
|-----------|--------|
${milestones.map((m) => `| ${m.name} | ${m.status} |`).join('\n')}

${dashboard.blockers.length > 0 ? `## Blockers\n${dashboard.blockers.map((b) => `- ${b}`).join('\n')}` : ''}

---
*Generated by Procurement Automation Engine*
`;
  }
}
