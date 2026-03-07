import { z } from "zod";

export interface IngestConnector<TConfig = unknown, TState = unknown> {
  /**
   * Discover available resources from the source.
   */
  discover(): Promise<ResourceDefinition[]>;

  /**
   * Pull data from a specific resource.
   * returns a generator or async iterator of records.
   */
  pull(resource: ResourceDefinition, state?: TState): AsyncGenerator<IngestRecord, void, unknown>;

  /**
   * Acknowledge that a batch of records has been processed.
   */
  ack(checkpoint: Checkpoint): Promise<void>;

  /**
   * Create a checkpoint for the current state.
   */
  checkpoint(state: TState): Promise<Checkpoint>;
}

export interface ResourceDefinition {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface IngestRecord {
  id: string;
  data: unknown;
  metadata?: Record<string, unknown>;
  extractedAt: Date;
}

export interface Checkpoint {
  resourceId: string;
  cursor: string;
  timestamp: number;
}

export interface ConnectorLifecycle {
  onStart?(): Promise<void>;
  onStop?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}
