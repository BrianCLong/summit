import { EventEmitter } from 'events';
import { Entity, Document } from '../data-model/types';

export enum IngestionEvent {
  PIPELINE_STARTED = 'ingestion.pipeline.started',
  PIPELINE_COMPLETED = 'ingestion.pipeline.completed',
  PIPELINE_FAILED = 'ingestion.pipeline.failed',
  DOCUMENT_INDEXED = 'ingestion.document.indexed',
  DLQ_RECORD_CREATED = 'ingestion.dlq.record.created',
}

interface PipelineEventPayload {
  pipelineKey: string;
  tenantId: string;
  timestamp: string;
  meta?: any;
}

interface DocumentEventPayload extends PipelineEventPayload {
  documentId: string;
}

class IngestionEventBus extends EventEmitter {
  emitPipelineStarted(payload: PipelineEventPayload) {
    this.emit(IngestionEvent.PIPELINE_STARTED, payload);
  }

  emitPipelineCompleted(payload: PipelineEventPayload) {
    this.emit(IngestionEvent.PIPELINE_COMPLETED, payload);
  }

  emitPipelineFailed(payload: PipelineEventPayload & { error: string }) {
    this.emit(IngestionEvent.PIPELINE_FAILED, payload);
  }

  emitDocumentIndexed(payload: DocumentEventPayload) {
    this.emit(IngestionEvent.DOCUMENT_INDEXED, payload);
  }
}

export const ingestionEvents = new IngestionEventBus();
