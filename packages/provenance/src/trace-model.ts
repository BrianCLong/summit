import { Receipt, ActorRef } from './index';

export interface TraceStep {
  id: string;
  type: 'action' | 'check' | 'decision';
  name: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  durationMs: number;
  timestamp: string;
  receipt?: Receipt; // Link to cryptographic receipt
}

export interface Trace {
  id: string;
  mandateId: string;
  intent: string;
  actor: ActorRef;
  steps: TraceStep[];
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export interface EvidenceBundle {
  id: string;
  traceId: string;
  artifacts: {
    name: string;
    hash: string;
    url?: string;
    content?: string; // For small artifacts
  }[];
  signature: string; // Signature of the bundle
}
