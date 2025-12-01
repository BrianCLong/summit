/**
 * Saga Pattern Types
 */

export interface SagaDefinition {
  sagaId: string;
  name: string;
  steps: SagaStep[];
  compensations: Map<string, CompensationHandler>;
}

export interface SagaStep {
  stepId: string;
  name: string;
  action: StepAction;
  compensation?: CompensationHandler;
  retry?: RetryPolicy;
}

export type StepAction = (context: SagaContext) => Promise<any>;
export type CompensationHandler = (context: SagaContext) => Promise<void>;

export interface RetryPolicy {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  delay: number;
}

export interface SagaContext {
  sagaId: string;
  correlationId: string;
  data: Map<string, any>;
  startedAt: Date;
  currentStep?: string;
  completedSteps: string[];
  failedStep?: string;
  error?: any;
}

export enum SagaStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  COMPENSATING = 'compensating',
  COMPENSATED = 'compensated',
  FAILED = 'failed'
}

export interface SagaState {
  sagaId: string;
  sagaName: string;
  status: SagaStatus;
  context: SagaContext;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface SagaEvent {
  eventType: 'saga.started' | 'saga.step.completed' | 'saga.step.failed' |
    'saga.completed' | 'saga.compensating' | 'saga.compensated' | 'saga.failed';
  sagaId: string;
  stepId?: string;
  timestamp: Date;
  data?: any;
}
