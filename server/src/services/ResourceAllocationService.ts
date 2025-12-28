
import { DecisionContext, DecisionOption } from '../decision/types.js';
import { ProvenanceLedgerV2 } from '../provenance/ledger.js';

export interface ResourceRequest {
  id: string;
  userId: string;
  projectId: string;
  resourceType: 'GPU' | 'CPU' | 'MEMORY';
  amount: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'THROTTLED';
  currentUsage: number;
  userTier: 'FREE' | 'PRO' | 'ENTERPRISE';
}

export class ResourceAllocationService {
  private ledger: ProvenanceLedgerV2;

  private static instance: ResourceAllocationService;

  public static getInstance(): ResourceAllocationService {
    if (!ResourceAllocationService.instance) {
      ResourceAllocationService.instance = new ResourceAllocationService();
    }
    return ResourceAllocationService.instance;
  }

  constructor() {
    this.ledger = ProvenanceLedgerV2.getInstance();
  }

  // Mock database fetch
  private async getRequest(requestId: string): Promise<ResourceRequest | null> {
    // In a real app, fetch from DB
    if (requestId === 'req-123') {
      return {
        id: 'req-123',
        userId: 'user-001',
        projectId: 'proj-alpha',
        resourceType: 'GPU',
        amount: 4,
        priority: 'HIGH',
        status: 'PENDING',
        currentUsage: 2,
        userTier: 'PRO'
      };
    } else if (requestId === 'req-456') {
       return {
        id: 'req-456',
        userId: 'user-002',
        projectId: 'proj-beta',
        resourceType: 'GPU',
        amount: 8,
        priority: 'LOW',
        status: 'PENDING',
        currentUsage: 0,
        userTier: 'FREE'
      };
    }
    return null;
  }

  public async getQuotaDecisionContext(requestId: string): Promise<DecisionContext | null> {
    const request = await this.getRequest(requestId);
    if (!request) return null;

    // Simulate Evidence Logic
    const evidence = {
      sourceId: `usage-metrics-${request.userId}`,
      confidence: 0.95, // High confidence in usage metrics
      uncertainties: [] as string[],
      missingData: [] as string[]
    };

    if (request.priority === 'HIGH' && request.userTier === 'FREE') {
       evidence.uncertainties.push('User tier mismatch with requested priority');
    }

    // Logic to determine options
    const options: DecisionOption[] = [];

    const isHighUsage = request.currentUsage + request.amount > 10;
    const isEnterprise = request.userTier === 'ENTERPRISE';

    // Option 1: Approve Full Amount
    options.push({
      id: 'approve_full',
      label: 'Approve Full Request',
      description: `Grant ${request.amount} ${request.resourceType}s immediately.`,
      type: (!isHighUsage || isEnterprise) ? 'RECOMMENDED' : 'RESTRICTED',
      riskLevel: isHighUsage ? 'HIGH' : 'LOW',
      constraints: isHighUsage && !isEnterprise ? ['Usage limit exceeded for non-Enterprise tier'] : []
    });

    // Option 2: Approve with Throttling / Partial
    options.push({
      id: 'approve_partial',
      label: 'Approve Partial (Throttled)',
      description: `Grant ${Math.floor(request.amount / 2)} ${request.resourceType}s now, queue the rest.`,
      type: (isHighUsage && !isEnterprise) ? 'RECOMMENDED' : 'AVAILABLE',
      riskLevel: 'LOW',
      constraints: []
    });

    // Option 3: Deny
    options.push({
      id: 'deny',
      label: 'Deny Request',
      description: 'Reject the resource allocation request.',
      type: 'AVAILABLE',
      riskLevel: 'LOW',
      constraints: []
    });

    return {
      id: `decision-quota-${request.id}`,
      name: 'Resource Quota Allocation',
      description: `Review allocation of ${request.amount} ${request.resourceType} units for ${request.projectId}.`,
      inputs: [
        { label: 'User Tier', value: request.userTier },
        { label: 'Current Usage', value: `${request.currentUsage} units` },
        { label: 'Requested Amount', value: request.amount },
        { label: 'Priority', value: request.priority }
      ],
      evidence,
      options
    };
  }

  public async makeDecision(requestId: string, optionId: string, actorId: string): Promise<void> {
      // In real world: Update DB status

      try {
        // @ts-ignore
        await this.ledger.appendEntry({
             actorId,
             actionType: 'ALLOCATE_RESOURCE',
             resourceType: 'resource_request',
             resourceId: requestId,
             actorType: 'user',
             payload: {
               mutationType: 'UPDATE',
               entityId: requestId,
               entityType: 'resource_request',
               changes: [
                  { field: 'status', oldValue: 'PENDING', newValue: optionId === 'deny' ? 'DENIED' : 'APPROVED' },
                  { field: 'decision', oldValue: null, newValue: optionId }
               ]
             },
             metadata: {
                 decision: optionId
             }
        });
      } catch (err) {
          console.error('Failed to log to ledger', err);
      }
  }
}
