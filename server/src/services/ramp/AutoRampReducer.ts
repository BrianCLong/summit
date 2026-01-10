import { randomUUID } from 'node:crypto';
import logger from '../../utils/logger';
import { eventBus, type SummitEvent } from '../../lib/events/event-bus.js';
import { recordIncidentReceipt } from '../../provenance/incidentReceipt.js';

export interface SLOBreachEventData {
  tenantId: string;
  alertId: string;
  alertType: string;
  severity: 'critical' | 'warning' | 'info';
  sloType: string;
  currentValue: number;
  targetValue: number;
  burnRate: number;
  affectedServices: string[];
  recommendedActions: string[];
  timestamp: string;
  correlationId?: string;
  environment?: string;
  currentRamp?: number;
}

export interface RampReductionAction {
  id: string;
  tenantId: string;
  previousRamp: number;
  newRamp: number;
  holdMinutes: number;
  reason: string;
  sloType: string;
  severity: string;
  triggeredAt: string;
}

interface AutoRampConfig {
  enabled: boolean;
  minRamp: number;
  stepDown: number;
  holdMinutes: number;
}

interface RampState {
  currentRamp: number;
  lastReductionAt?: Date;
}

export class AutoRampReducer {
  private readonly config: AutoRampConfig;
  private readonly rampState = new Map<string, RampState>();

  constructor(config: Partial<AutoRampConfig> = {}) {
    this.config = {
      enabled: process.env.AUTO_RAMP_REDUCER_ENABLED !== 'false',
      minRamp: Number(process.env.AUTO_RAMP_MIN_STAGE ?? '0.1'),
      stepDown: Number(process.env.AUTO_RAMP_STEP_DOWN ?? '0.25'),
      holdMinutes: Number(process.env.AUTO_RAMP_HOLD_MINUTES ?? '30'),
      ...config,
    };

    eventBus.subscribe('slo.breach', (event: SummitEvent<SLOBreachEventData>) => {
      void this.handleBreach(event);
    });
  }

  private getCurrentRamp(tenantId: string, eventRamp?: number): number {
    if (typeof eventRamp === 'number') {
      return eventRamp;
    }
    return this.rampState.get(tenantId)?.currentRamp ?? 1;
  }

  private buildReduction(
    tenantId: string,
    event: SummitEvent<SLOBreachEventData>,
  ): RampReductionAction {
    const previousRamp = this.getCurrentRamp(tenantId, event.data.currentRamp);
    const newRamp = Math.max(this.config.minRamp, previousRamp - this.config.stepDown);
    return {
      id: randomUUID(),
      tenantId,
      previousRamp,
      newRamp,
      holdMinutes: this.config.holdMinutes,
      reason: 'slo_breach',
      sloType: event.data.sloType,
      severity: event.data.severity,
      triggeredAt: new Date().toISOString(),
    };
  }

  private async handleBreach(
    event: SummitEvent<SLOBreachEventData>,
  ): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Auto-ramp reducer disabled; breach recorded for audit', {
        tenantId: event.data.tenantId,
        alertId: event.data.alertId,
      });
      await recordIncidentReceipt({
        tenantId: event.data.tenantId,
        breachId: event.data.alertId,
        correlationId: event.correlationId,
        environment: event.data.environment,
        breachContext: event.data,
      });
      return;
    }

    const reduction = this.buildReduction(event.data.tenantId, event);
    this.rampState.set(event.data.tenantId, {
      currentRamp: reduction.newRamp,
      lastReductionAt: new Date(),
    });

    eventBus.publish('ramp.reduced', reduction);

    logger.warn('Auto-ramp reduction executed', {
      tenantId: event.data.tenantId,
      alertId: event.data.alertId,
      sloType: event.data.sloType,
      previousRamp: reduction.previousRamp,
      newRamp: reduction.newRamp,
      holdMinutes: reduction.holdMinutes,
    });

    await recordIncidentReceipt({
      tenantId: event.data.tenantId,
      breachId: event.data.alertId,
      correlationId: event.correlationId,
      environment: event.data.environment,
      breachContext: event.data,
      rampAction: reduction,
    });
  }
}

export const autoRampReducer = new AutoRampReducer();
