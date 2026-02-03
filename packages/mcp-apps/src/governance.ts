import { AgUiBus } from './ag-ui.js';
import { McpUiResource } from './types.js';

export interface ApprovalRequest {
  policy: string;
  context: any;
  uiResourceUri?: string;
}

export interface ApprovalDecision {
  approved: boolean;
  rationale: string;
  timestamp: string;
}

/**
 * Governance primitives for MCP Apps
 */
export class McpGovernance {
  constructor(private readonly agUiBus: AgUiBus) {}

  /**
   * Triggers a human-in-the-loop approval gate.
   * Blocks until a decision is recorded via the UI.
   */
  public async requiresApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    const requestId = crypto.randomUUID();

    // 1. Emit an event to trigger the UI
    this.agUiBus.emit('event', {
      id: crypto.randomUUID(),
      type: 'UI_ACTION',
      timestamp: new Date().toISOString(),
      payload: {
        action: 'APPROVAL_REQUIRED',
        requestId,
        policy: request.policy,
        context: request.context,
        uiResourceUri: request.uiResourceUri
      }
    });

    // 2. Wait for the decision with correlation ID
    return new Promise((resolve) => {
      const listener = (event: any) => {
        if (
          event.type === 'UI_ACTION' &&
          event.payload?.action === 'APPROVAL_DECISION' &&
          event.payload?.correlationId === requestId
        ) {
          this.agUiBus.removeListener('event', listener);
          resolve({
            approved: event.payload.approved,
            rationale: event.payload.rationale,
            timestamp: event.timestamp
          });
        }
      };

      this.agUiBus.on('event', listener);

      // Timeout after 5 minutes for MVP
      setTimeout(() => {
        this.agUiBus.removeListener('event', listener);
        resolve({
          approved: false,
          rationale: 'Approval timed out',
          timestamp: new Date().toISOString()
        });
      }, 300000);
    });
  }
}
