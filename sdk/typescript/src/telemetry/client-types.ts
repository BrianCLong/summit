import { DetectorFinding } from './detectors';
import { PolicyAction } from './policies';

export interface RedactionEntry {
  action: PolicyAction;
  reason?: string;
  findings?: DetectorFinding[];
  hashPreview?: string;
}

export interface TelemetryMetadata {
  redactionMap: Record<string, RedactionEntry>;
  droppedFields: string[];
  sampleRate: number;
  sampled: boolean;
  blocked?: boolean;
}

export interface TelemetryEventInput {
  name: string;
  attributes: Record<string, unknown>;
  timestamp?: number;
}

export interface ProcessedTelemetryEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, unknown>;
  metadata: TelemetryMetadata;
}

export interface RecordResult {
  accepted: boolean;
  reason?: 'sampled_out' | 'denied';
  event?: ProcessedTelemetryEvent;
}
