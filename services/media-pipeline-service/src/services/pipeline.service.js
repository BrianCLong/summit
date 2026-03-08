"use strict";
/**
 * Pipeline Processing Service
 *
 * Orchestrates the complete media processing pipeline:
 * Ingest → Validate → Transcribe → Diarize → Segment → Redact → Sync
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineService = exports.PipelineService = void 0;
const transcription_service_js_1 = require("./transcription.service.js");
const segmentation_service_js_1 = require("./segmentation.service.js");
const graph_service_js_1 = require("./graph.service.js");
const spacetime_service_js_1 = require("./spacetime.service.js");
const provenance_service_js_1 = require("./provenance.service.js");
const policy_service_js_1 = require("./policy.service.js");
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const index_js_1 = __importDefault(require("../config/index.js"));
class PipelineService {
    log = (0, logger_js_1.createChildLogger)({ service: 'PipelineService' });
    eventCallbacks = [];
    /**
     * Subscribe to pipeline events
     */
    onEvent(callback) {
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
    emitEvent(type, mediaAssetId, correlationId, payload) {
        const event = {
            id: (0, hash_js_1.generateId)(),
            type,
            timestamp: (0, time_js_1.now)(),
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
            }
            catch (error) {
                this.log.error({ error }, 'Event callback error');
            }
        }
    }
    /**
     * Process a media asset through the full pipeline
     */
    async process(mediaAsset, options = {}) {
        const correlationId = (0, hash_js_1.generateId)();
        const startTime = Date.now();
        const stages = [];
        const errors = [];
        let transcript;
        let communicationEntityId;
        let spacetimeEventId;
        this.log.info({ mediaAssetId: mediaAsset.id, correlationId, options }, 'Starting pipeline processing');
        this.emitEvent('processing.started', mediaAsset.id, correlationId, { options });
        try {
            // Stage 1: Record evidence
            const evidenceStart = Date.now();
            const evidenceResult = await provenance_service_js_1.provenanceService.recordEvidence(mediaAsset);
            stages.push({
                name: 'evidence',
                status: evidenceResult.success ? 'completed' : 'failed',
                durationMs: Date.now() - evidenceStart,
                error: evidenceResult.error?.message,
            });
            // Stage 2: Apply retention policy
            const retentionStart = Date.now();
            const retentionResult = policy_service_js_1.policyService.applyRetentionPolicy(mediaAsset);
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
                const transcriptionResult = await transcription_service_js_1.transcriptionService.transcribe(mediaAsset, {
                    provider: options.sttProvider,
                    language: options.language,
                    enableDiarization: !options.skipDiarization,
                    expectedSpeakerCount: options.expectedSpeakerCount,
                });
                if (transcriptionResult.success && transcriptionResult.transcript) {
                    transcript = transcriptionResult.transcript;
                    mediaAsset.transcriptId = transcript.id;
                    // Record transcription transform
                    await provenance_service_js_1.provenanceService.recordTransform({
                        mediaAssetId: mediaAsset.id,
                        transcriptId: transcript.id,
                        eventType: 'transform.recorded',
                        transformStep: 'transcription',
                        transformProvider: transcriptionResult.metadata.sttProvider,
                        inputChecksum: mediaAsset.checksum,
                        outputChecksum: (0, hash_js_1.hashObject)(transcript.utterances),
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
                }
                else {
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
                            timestamp: (0, time_js_1.now)(),
                            retryable: transcriptionResult.error.retryable,
                        });
                    }
                }
            }
            else {
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
                    const segmentationResult = segmentation_service_js_1.segmentationService.segment(transcript);
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
                }
                catch (error) {
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
                        timestamp: (0, time_js_1.now)(),
                        retryable: true,
                    });
                }
            }
            else {
                stages.push({
                    name: 'segmentation',
                    status: 'skipped',
                    durationMs: 0,
                });
            }
            // Stage 5: Redaction
            if (transcript &&
                !options.skipRedaction &&
                policy_service_js_1.policyService.isAutoRedactionEnabled()) {
                const redactionStart = Date.now();
                try {
                    const { redactedTranscript, event } = policy_service_js_1.policyService.redactTranscript(transcript, options.redactionRules);
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
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    stages.push({
                        name: 'redaction',
                        status: 'failed',
                        durationMs: Date.now() - redactionStart,
                        error: message,
                    });
                }
            }
            else {
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
                const graphResult = await graph_service_js_1.graphService.syncToGraph(mediaAsset, transcript);
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
                }
                else {
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
                            timestamp: (0, time_js_1.now)(),
                            retryable: graphResult.error.retryable,
                        });
                    }
                }
            }
            else {
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
                const spacetimeResult = await spacetime_service_js_1.spacetimeService.emitEvent(mediaAsset, communicationEntityId, transcript);
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
                }
                else {
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
                            timestamp: (0, time_js_1.now)(),
                            retryable: spacetimeResult.error.retryable,
                        });
                    }
                }
            }
            else {
                stages.push({
                    name: 'spacetime_sync',
                    status: 'skipped',
                    durationMs: 0,
                });
            }
            // Update asset status
            const hasFailures = stages.some((s) => s.status === 'failed');
            mediaAsset.status = hasFailures ? 'failed' : 'completed';
            mediaAsset.processedAt = (0, time_js_1.now)();
            mediaAsset.processingErrors = errors.length > 0 ? errors : undefined;
            const totalDurationMs = Date.now() - startTime;
            this.emitEvent('processing.completed', mediaAsset.id, correlationId, {
                success: !hasFailures,
                stages: stages.map((s) => ({ name: s.name, status: s.status })),
                totalDurationMs,
            });
            this.log.info({
                mediaAssetId: mediaAsset.id,
                correlationId,
                success: !hasFailures,
                totalDuration: (0, time_js_1.formatDuration)(totalDurationMs),
                stageCount: stages.length,
                errorCount: errors.length,
            }, 'Pipeline processing completed');
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const totalDurationMs = Date.now() - startTime;
            this.log.error({ mediaAssetId: mediaAsset.id, correlationId, error: message }, 'Pipeline processing failed');
            this.emitEvent('processing.failed', mediaAsset.id, correlationId, {
                error: message,
            });
            errors.push({
                code: 'PIPELINE_ERROR',
                message,
                stage: 'pipeline',
                timestamp: (0, time_js_1.now)(),
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
    isTranscribable(mediaAsset) {
        const transcribableTypes = ['audio', 'video'];
        return transcribableTypes.includes(mediaAsset.type);
    }
    /**
     * Create a processing job
     */
    createJob(mediaAssetId, type, priority = 50, input) {
        return {
            id: (0, hash_js_1.generateId)(),
            mediaAssetId,
            type,
            status: 'pending',
            priority,
            input,
            retryCount: 0,
            maxRetries: index_js_1.default.maxRetries,
            timeout: index_js_1.default.jobTimeoutMs,
            createdAt: (0, time_js_1.now)(),
        };
    }
    /**
     * Update job status
     */
    updateJobStatus(job, status, output, error) {
        return {
            ...job,
            status,
            output,
            error,
            updatedAt: (0, time_js_1.now)(),
            completedAt: status === 'completed' || status === 'failed' ? (0, time_js_1.now)() : undefined,
        };
    }
}
exports.PipelineService = PipelineService;
exports.pipelineService = new PipelineService();
exports.default = exports.pipelineService;
