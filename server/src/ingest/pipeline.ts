import { PipelineConfig } from '../data-model/types.js';
import { Logger } from 'pino';

export interface PipelineContext {
  pipeline: PipelineConfig;
  runId: string;
  tenantId: string;
  logger: Logger;
}

export interface PipelineStage {
  name: string;
  process(ctx: PipelineContext, records: Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
}

export abstract class BasePipelineStage implements PipelineStage {
  abstract name: string;
  abstract process(ctx: PipelineContext, records: Record<string, unknown>[]): Promise<Record<string, unknown>[]>;
}
