export type PlaybookStepKind = 'action';

export interface PlaybookStepRetryPolicy {
  maxAttempts: number;
  backoffSeconds?: number;
}

export interface PlaybookStep {
  id: string;
  kind: PlaybookStepKind;
  name?: string;
  action: string;
  input?: Record<string, unknown>;
  retry?: PlaybookStepRetryPolicy;
}

export interface PlaybookDefinition {
  id: string;
  name: string;
  description?: string;
  steps: PlaybookStep[];
}

export interface PlaybookRunContext {
  runId: string;
  playbookId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface PlaybookRunState {
  runId: string;
  playbook: PlaybookDefinition;
  idempotencyKey: string;
  status: 'running' | 'succeeded' | 'failed';
  currentStepIndex: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface PlaybookSignature {
  algorithm: string;
  signature: string;
  publicKey: string;
  signedAt: string;
}

export interface Playbook extends PlaybookDefinition {
  version: string;
  signature?: PlaybookSignature;
}
