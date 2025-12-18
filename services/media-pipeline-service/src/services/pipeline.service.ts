/**
 * Pipeline Processing Service
 *
 * Orchestrates the complete media processing pipeline:
 * Ingest → Validate → Transcribe → Diarize → Segment → Redact → Sync
 */

import type {
  MediaAsset,
  Transcript,
  ProcessingJob,
  ProcessingStatus,
  ProcessingJobType,
  ProcessingError,
} from '../types/media.js';
import type { PipelineEvent, PipelineEventType } from '../types/events.js';
import { transcriptionService } from './transcription.service.js';
import { segmentationService } from './segmentation.service.js';
import { graphService } from './graph.service.js';
import { spacetimeService } from './spacetime.service.js';
import { provenanceService } from './provenance.service.js';
import { policyService } from './policy.service.js';
import { createChildLogger } from '../utils/logger.js';
import { generateId, hashObject } from '../utils/hash.js';
import { now, formatDuration } from '../utils/time.js';
import config from '../config/index.js';

export interface PipelineOptions {
  /** Skip transcription */
  skipTranscription?: boolean;
  /** Skip diarization */
  skipDiarization?: boolean;
  /** Skip segmentation */
  skipSegmentation?: boolean;
  /** Skip redaction */
  skipRedaction?: boolean;
  /** Skip graph sync */
  skipGraphSync?: boolean;
  /** Skip spacetime sync */
  skipSpacetimeSync?: boolean;
  /** STT provider override */
  sttProvider?: string;
  /** Language hint */
  language?: string;
  /** Expected speaker count */
  expectedSpeakerCount?: number;
  /** Custom redaction rules */
  redactionRules?: string[];
  /** Priority (0-100) */
  priority?: number;
}

export interface PipelineResult {
  success: boolean;
  mediaAsset: MediaAsset;
  transcript?: Transcript;
  communicationEntityId?: string;
  spacetimeEventId?: string;
  errors: ProcessingError[];
  stages: Array<{
    name: string;
    status: 'completed' | 'failed' | 'skipped';
    durationMs: number;
    error?: string;
  }>;
  totalDurationMs: number;
}

type EventCallback = (event: PipelineEvent) => void;

export class PipelineService {
  private log = createChildLogger({ service: 'PipelineService' });
  private eventCallbacks: EventCallback[] = [];

  /**
   * Subscribe to pipeline events
   */
  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index >= 0) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit a pipeline event
   */
  private emitEvent(
    type: PipelineEventType,
    mediaAssetId: string,
    correlationId: string,
    payload: Record<string, unknown>
  ): void {
    const event: PipelineEvent = {
      id: generateId(),
      type,
      timestamp: now(),
      correlationId,
      mediaAssetId,
      payload,
      metadata: {
        source: 'pipeline-service',
        version: '1.0.0',
      },
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.log.error({ error }, 'Event callback error');
      }
    }
  }

  /**
   * Process a media asset through the full pipeline
   */
  async process(
    mediaAsset: MediaAsset,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const correlationId = generateId();
    const startTime = Date.now();
    const stages: PipelineResult['stages'] = [];
    const errors: ProcessingError[] = [];
    let transcript: Transcript | undefined;
    let communicationEntityId: string | undefined;
    let spacetimeEventId: string | undefined;

    this.log.info(
      { mediaAssetId: mediaAsset.id, correlationId, options },
      'Starting pipeline processing'
    );

    this.emitEvent('processing.started', mediaAsset.id, correlationId, { options });

    try {
      // Stage 1: Record evidence
      const evidenceStart = Date.now();
      const evidenceResult = await provenanceService.recordEvidence(mediaAsset);
      stages.push({
        name: 'evidence',
        status: evidenceResult.success ? 'completed' : 'failed',
        durationMs: Date.now() - evidenceStart,
        error: evidenceResult.error?.message,
      });

      // Stage 2: Apply retention policy
      const retentionStart = Date.now();
      const retentionResult = policyService.applyRetentionPolicy(mediaAsset);
      mediaAsset.expiresAt = retentionResult.expiresAt;
      stages.push({
        name: 'retention',
        status: 'completed',
        durationMs: Date.now() - retentionStart,
      });

      // Stage 3: Transcription
      if (!options.skipTranscription && this.isTranscribable(mediaAsset)) {
        const transcriptionStart = Date.now();
        this.emitEvent('transcription.started', mediaAsset.id, correlationId, {});

        const transcriptionResult = await transcriptionService.transcribe(mediaAsset, {
          provider: options.sttProvider,
          language: options.language,
          enableDiarization: !options.skipDiarization,
          expectedSpeakerCount: options.expectedSpeakerCount,
        });

        if (transcriptionResult.success && transcriptionResult.transcript) {
          transcript = transcriptionResult.transcript;
          mediaAsset.transcriptId = transcript.id;

          // Record transcription transform
          await provenanceService.recordTransform({
            mediaAssetId: mediaAsset.id,
            transcriptId: transcript.id,
            eventType: 'transform.recorded',
            transformStep: 'transcription',
            transformProvider: transcriptionResult.metadata.sttProvider,
            inputChecksum: mediaAsset.checksum,
            outputChecksum: hashObject(transcript.utterances),
          });

          this.emitEvent('transcription.completed', mediaAsset.id, correlationId, {
            transcriptId: transcript.id,
            utteranceCount: transcript.utterances.length,
          });

          stages.push({
            name: 'transcription',
            status: 'completed',
            durationMs: Date.now() - transcriptionStart,
          });
        } else {
          this.emitEvent('transcription.failed', mediaAsset.id, correlationId, {
            error: transcriptionResult.error,
          });

          stages.push({
            name: 'transcription',
            status: 'failed',
            durationMs: Date.now() - transcriptionStart,
            error: transcriptionResult.error?.message,
          });

          if (transcriptionResult.error) {
            errors.push({
              code: transcriptionResult.error.code,
              message: transcriptionResult.error.message,
              stage: 'transcription',
              timestamp: now(),
              retryable: transcriptionResult.error.retryable,
            });
          }
        }
      } else {
        stages.push({
          name: 'transcription',
          status: 'skipped',
          durationMs: 0,
        });
      }

      // Stage 4: Segmentation
      if (transcript && !options.skipSegmentation) {
        const segmentationStart = Date.now();
        this.emitEvent('segmentation.started', mediaAsset.id, correlationId, {});

        try {
          const segmentationResult = segmentationService.segment(transcript);
          transcript.threads = segmentationResult.threads;

          // Update key turns
          for (const keyTurn of segmentationResult.keyTurns) {
            const utterance = transcript.utterances.find((u) => u.id === keyTurn.id);
            if (utterance) {
              utterance.isKeyTurn = true;
            }
          }

          this.emitEvent('segmentation.completed', mediaAsset.id, correlationId, {
            threadCount: segmentationResult.threads.length,
            keyTurnCount: segmentationResult.keyTurns.length,
          });

          stages.push({
            name: 'segmentation',
            status: 'completed',
            durationMs: Date.now() - segmentationStart,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.emitEvent('segmentation.failed', mediaAsset.id, correlationId, {
            error: message,
          });

          stages.push({
            name: 'segmentation',
            status: 'failed',
            durationMs: Date.now() - segmentationStart,
            error: message,
          });

          errors.push({
            code: 'SEGMENTATION_FAILED',
            message,
            stage: 'segmentation',
            timestamp: now(),
            retryable: true,
          });
        }
      } else {
        stages.push({
          name: 'segmentation',
          status: 'skipped',
          durationMs: 0,
        });
      }

      // Stage 5: Redaction
      if (
        transcript &&
        !options.skipRedaction &&
        policyService.isAutoRedactionEnabled()
      ) {
        const redactionStart = Date.now();

        try {
          const { redactedTranscript, event } = policyService.redactTranscript(
            transcript,
            options.redactionRules
          );
          transcript = redactedTranscript;

          this.emitEvent('policy.redaction.applied', mediaAsset.id, correlationId, {
            redactionsCount: event.redactionsCount,
            rulesApplied: event.rulesApplied,
          });

          stages.push({
            name: 'redaction',
            status: 'completed',
            durationMs: Date.now() - redactionStart,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          stages.push({
            name: 'redaction',
            status: 'failed',
            durationMs: Date.now() - redactionStart,
            error: message,
          });
        }
      } else {
        stages.push({
          name: 'redaction',
          status: 'skipped',
          durationMs: 0,
        });
      }

      // Stage 6: Graph sync
      if (!options.skipGraphSync) {
        const graphStart = Date.now();
        this.emitEvent('graph.sync.started', mediaAsset.id, correlationId, {});

        const graphResult = await graphService.syncToGraph(mediaAsset, transcript);

        if (graphResult.success) {
          communicationEntityId = graphResult.communicationEntityId;
          mediaAsset.communicationEntityId = communicationEntityId;

          this.emitEvent('graph.sync.completed', mediaAsset.id, correlationId, {
            communicationEntityId,
            participantCount: graphResult.participantEntityIds?.length || 0,
          });

          stages.push({
            name: 'graph_sync',
            status: 'completed',
            durationMs: Date.now() - graphStart,
          });
        } else {
          this.emitEvent('graph.sync.failed', mediaAsset.id, correlationId, {
            error: graphResult.error,
          });

          stages.push({
            name: 'graph_sync',
            status: 'failed',
            durationMs: Date.now() - graphStart,
            error: graphResult.error?.message,
          });

          if (graphResult.error) {
            errors.push({
              code: graphResult.error.code,
              message: graphResult.error.message,
              stage: 'graph_sync',
              timestamp: now(),
              retryable: graphResult.error.retryable,
            });
          }
        }
      } else {
        stages.push({
          name: 'graph_sync',
          status: 'skipped',
          durationMs: 0,
        });
      }

      // Stage 7: Spacetime sync
      if (!options.skipSpacetimeSync) {
        const spacetimeStart = Date.now();
        this.emitEvent('spacetime.sync.started', mediaAsset.id, correlationId, {});

        const spacetimeResult = await spacetimeService.emitEvent(
          mediaAsset,
          communicationEntityId,
          transcript
        );

        if (spacetimeResult.success) {
          spacetimeEventId = spacetimeResult.eventId;
          mediaAsset.spacetimeEventId = spacetimeEventId;

          this.emitEvent('spacetime.sync.completed', mediaAsset.id, correlationId, {
            eventId: spacetimeEventId,
          });

          stages.push({
            name: 'spacetime_sync',
            status: 'completed',
            durationMs: Date.now() - spacetimeStart,
          });
        } else {
          this.emitEvent('spacetime.sync.failed', mediaAsset.id, correlationId, {
            error: spacetimeResult.error,
          });

          stages.push({
            name: 'spacetime_sync',
            status: 'failed',
            durationMs: Date.now() - spacetimeStart,
            error: spacetimeResult.error?.message,
          });

          if (spacetimeResult.error) {
            errors.push({
              code: spacetimeResult.error.code,
              message: spacetimeResult.error.message,
              stage: 'spacetime_sync',
              timestamp: now(),
              retryable: spacetimeResult.error.retryable,
            });
          }
        }
      } else {
        stages.push({
          name: 'spacetime_sync',
          status: 'skipped',
          durationMs: 0,
        });
      }

      // Update asset status
      const hasFailures = stages.some((s) => s.status === 'failed');
      mediaAsset.status = hasFailures ? 'failed' : 'completed';
      mediaAsset.processedAt = now();
      mediaAsset.processingErrors = errors.length > 0 ? errors : undefined;

      const totalDurationMs = Date.now() - startTime;

      this.emitEvent('processing.completed', mediaAsset.id, correlationId, {
        success: !hasFailures,
        stages: stages.map((s) => ({ name: s.name, status: s.status })),
        totalDurationMs,
      });

      this.log.info(
        {
          mediaAssetId: mediaAsset.id,
          correlationId,
          success: !hasFailures,
          totalDuration: formatDuration(totalDurationMs),
          stageCount: stages.length,
          errorCount: errors.length,
        },
        'Pipeline processing completed'
      );

      return {
        success: !hasFailures,
        mediaAsset,
        transcript,
        communicationEntityId,
        spacetimeEventId,
        errors,
        stages,
        totalDurationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const totalDurationMs = Date.now() - startTime;

      this.log.error(
        { mediaAssetId: mediaAsset.id, correlationId, error: message },
        'Pipeline processing failed'
      );

      this.emitEvent('processing.failed', mediaAsset.id, correlationId, {
        error: message,
      });

      errors.push({
        code: 'PIPELINE_ERROR',
        message,
        stage: 'pipeline',
        timestamp: now(),
        retryable: true,
      });

      mediaAsset.status = 'failed';
      mediaAsset.processingErrors = errors;

      return {
        success: false,
        mediaAsset,
        errors,
        stages,
        totalDurationMs,
      };
    }
  }

  /**
   * Check if a media asset can be transcribed
   */
  private isTranscribable(mediaAsset: MediaAsset): boolean {
    const transcribableTypes = ['audio', 'video'];
    return transcribableTypes.includes(mediaAsset.type);
  }

  /**
   * Create a processing job
   */
  createJob(
    mediaAssetId: string,
    type: ProcessingJobType,
    priority: number = 50,
    input?: Record<string, unknown>
  ): ProcessingJob {
    return {
      id: generateId(),
      mediaAssetId,
      type,
      status: 'pending',
      priority,
      input,
      retryCount: 0,
      maxRetries: config.maxRetries,
      timeout: config.jobTimeoutMs,
      createdAt: now(),
    };
  }

  /**
   * Update job status
   */
  updateJobStatus(
    job: ProcessingJob,
    status: ProcessingStatus,
    output?: Record<string, unknown>,
    error?: ProcessingError
  ): ProcessingJob {
    return {
      ...job,
      status,
      output,
      error,
      updatedAt: now(),
      completedAt: status === 'completed' || status === 'failed' ? now() : undefined,
    };
  }
}

export const pipelineService = new PipelineService();
export default pipelineService;
