import { randomUUID } from 'crypto';
import { eventService } from '../../events/EventService.js';
import { EventType, EVENT_VERSION } from '../../integrations/foundation/contracts.js';

export interface RampSloInputs {
  /**
   * Error rate percentage sourced from HTTP/GraphQL error metrics.
   */
  errorRate: number;
  /**
   * Receipt backlog sourced from ingest backlog gauges.
   */
  receiptBacklog: number;
}

export interface RampPolicy {
  maxErrorRate: number;
  maxReceiptBacklog: number;
  reductionStepPercent: number;
  rollbackFloorPercent: number;
}

export interface RampContext {
  tenantId: string;
  serviceName: string;
  deploymentId: string;
  rampPercent: number;
}

export interface RampDecision {
  action: 'hold' | 'reduce' | 'rollback';
  nextPercent: number;
  reasons: string[];
}

export class RampController {
  constructor(private readonly policy: RampPolicy) {}

  async evaluate(
    inputs: RampSloInputs,
    context: RampContext,
    onRollback?: (decision: RampDecision) => Promise<void>,
  ): Promise<RampDecision> {
    const reasons: string[] = [];

    if (inputs.errorRate > this.policy.maxErrorRate) {
      reasons.push(
        `error_rate=${inputs.errorRate.toFixed(4)} exceeds ${this.policy.maxErrorRate}`,
      );
    }

    if (inputs.receiptBacklog > this.policy.maxReceiptBacklog) {
      reasons.push(
        `receipt_backlog=${inputs.receiptBacklog} exceeds ${this.policy.maxReceiptBacklog}`,
      );
    }

    if (reasons.length === 0) {
      return { action: 'hold', nextPercent: context.rampPercent, reasons };
    }

    const projectedPercent = Math.max(
      this.policy.rollbackFloorPercent,
      context.rampPercent - this.policy.reductionStepPercent,
    );
    const action: RampDecision['action'] =
      context.rampPercent <= this.policy.rollbackFloorPercent
        ? 'rollback'
        : 'reduce';

    const decision: RampDecision = {
      action,
      nextPercent: projectedPercent,
      reasons,
    };

    await this.emitIncidentEvent(inputs, context, action, reasons);

    if (action === 'rollback' && onRollback) {
      await onRollback(decision);
      return { action, nextPercent: 0, reasons };
    }

    return decision;
  }

  private async emitIncidentEvent(
    inputs: RampSloInputs,
    context: RampContext,
    action: RampDecision['action'],
    reasons: string[],
  ): Promise<void> {
    const incidentId = randomUUID();

    await eventService.publish({
      event_id: randomUUID(),
      tenant_id: context.tenantId,
      type: EventType.INCIDENT_CREATED,
      occurred_at: new Date().toISOString(),
      actor: { id: 'ramp-controller', type: 'system' },
      resource_refs: [
        { type: 'incident', id: incidentId },
        { type: 'service', id: context.serviceName },
        { type: 'deployment', id: context.deploymentId },
      ],
      payload: {
        incidentId,
        kind: 'slo_breach',
        action,
        reasons,
        metrics: inputs,
        rampPercent: context.rampPercent,
      },
      schema_version: EVENT_VERSION,
    });
  }
}
