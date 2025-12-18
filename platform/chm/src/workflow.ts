import { ChmEventBus } from './events.js';
import {
  type DocumentTag,
  type ExportContext,
  type ExportDecision,
  type Classification
} from './config.js';
import { RuleEngine } from './rules.js';
import { TaxonomyRegistry } from './taxonomy.js';

export interface DowngradeRequest {
  id: string;
  documentId: string;
  requestedBy: string;
  targetLevel: Classification;
  approvers: Set<string>;
  requiredApprovals: number;
  status: 'pending' | 'approved' | 'rejected';
  rationale: string;
}

export interface ExportRequest {
  id: string;
  documentId: string;
  context: ExportContext;
  tag: DocumentTag;
  decision: ExportDecision;
  downgradedTag?: DocumentTag;
}

export class DowngradeWorkflow {
  private readonly bus: ChmEventBus;
  private readonly taxonomy: TaxonomyRegistry;
  private readonly ruleEngine: RuleEngine;
  private readonly downgradeRequests = new Map<string, DowngradeRequest>();

  constructor(bus: ChmEventBus, taxonomy: TaxonomyRegistry, ruleEngine: RuleEngine) {
    this.bus = bus;
    this.taxonomy = taxonomy;
    this.ruleEngine = ruleEngine;
  }

  requestDowngrade(payload: Omit<DowngradeRequest, 'approvers' | 'status'>): DowngradeRequest {
    if (payload.requiredApprovals < 2) {
      throw new Error('Dual control requires at least two approvals');
    }
    const request: DowngradeRequest = {
      ...payload,
      approvers: new Set(),
      status: 'pending'
    };
    this.downgradeRequests.set(request.id, request);
    return request;
  }

  approveDowngrade(id: string, approver: string): DowngradeRequest {
    const request = this.downgradeRequests.get(id);
    if (!request) {
      throw new Error(`Downgrade request ${id} not found`);
    }
    if (request.status !== 'pending') {
      return request;
    }
    request.approvers.add(approver);
    if (request.approvers.size >= request.requiredApprovals) {
      request.status = 'approved';
    }
    return request;
  }

  finalizeDowngrade(requestId: string, tag: DocumentTag): DocumentTag {
    const request = this.downgradeRequests.get(requestId);
    if (!request) throw new Error(`Downgrade request ${requestId} not found`);
    if (request.status !== 'approved') {
      throw new Error('Downgrade requires dual control approvals');
    }
    return this.taxonomy.downgradeTag(tag, request.targetLevel, Array.from(request.approvers));
  }

  handleExport(exportRequest: ExportRequest): ExportRequest {
    const { tag, context } = exportRequest;
    const decision = this.ruleEngine.evaluate(tag, context);
    exportRequest.decision = decision;
    return exportRequest;
  }
}
