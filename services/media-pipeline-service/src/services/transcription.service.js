"use strict";
/**
 * Transcription Service
 *
 * Orchestrates STT and diarization to produce transcripts with speaker attribution.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcriptionService = exports.TranscriptionService = void 0;
const registry_js_1 = require("../providers/registry.js");
const logger_js_1 = require("../utils/logger.js");
const hash_js_1 = require("../utils/hash.js");
const time_js_1 = require("../utils/time.js");
const index_js_1 = __importDefault(require("../config/index.js"));
class TranscriptionService {
    log = (0, logger_js_1.createChildLogger)({ service: 'TranscriptionService' });
    /**
     * Transcribe a media asset
     */
    async transcribe(mediaAsset, options = {}) {
        const startTime = Date.now();
        const correlationId = (0, hash_js_1.generateId)();
        this.log.info({ mediaAssetId: mediaAsset.id, correlationId, options }, 'Starting transcription');
        try {
            // Select STT provider
            const sttSelection = await registry_js_1.providerRegistry.selectSTTProvider(mediaAsset, {
                language: options.language,
            });
            const sttProvider = registry_js_1.providerRegistry.getSTTProvider(options.provider || sttSelection.providerId);
            if (!sttProvider) {
                throw new Error(`STT provider not found: ${options.provider || sttSelection.providerId}`);
            }
            // Run STT
            const sttStartTime = Date.now();
            const sttResult = await sttProvider.transcribe({
                mediaAsset,
                language: options.language,
                vocabularyHints: options.vocabularyHints,
                enableWordTimings: options.enableWordTimings,
            });
            const sttDurationMs = Date.now() - sttStartTime;
            if (!sttResult.success) {
                return {
                    success: false,
                    error: {
                        code: sttResult.error?.code || 'STT_FAILED',
                        message: sttResult.error?.message || 'STT transcription failed',
                        stage: 'stt',
                        retryable: sttResult.error?.retryable ?? true,
                    },
                    metadata: {
                        sttProvider: sttProvider.id,
                        sttDurationMs,
                        totalDurationMs: Date.now() - startTime,
                    },
                };
            }
            // Run diarization if enabled
            let diarizationResult;
            let diarizationDurationMs;
            let diarizationProviderId;
            if (options.enableDiarization !== false) {
                const diarizationSelection = await registry_js_1.providerRegistry.selectDiarizationProvider(mediaAsset, {
                    expectedSpeakers: options.expectedSpeakerCount,
                });
                const diarizationProvider = registry_js_1.providerRegistry.getDiarizationProvider(diarizationSelection.providerId);
                if (diarizationProvider) {
                    const diarizationStartTime = Date.now();
                    diarizationResult = await diarizationProvider.diarize({
                        mediaAsset,
                        expectedSpeakerCount: options.expectedSpeakerCount,
                        sttSegments: sttResult.segments,
                    });
                    diarizationDurationMs = Date.now() - diarizationStartTime;
                    diarizationProviderId = diarizationProvider.id;
                }
            }
            // Build transcript
            const transcript = this.buildTranscript(mediaAsset, sttResult, diarizationResult, sttProvider.id, diarizationProviderId);
            const totalDurationMs = Date.now() - startTime;
            this.log.info({
                mediaAssetId: mediaAsset.id,
                transcriptId: transcript.id,
                correlationId,
                utteranceCount: transcript.utterances.length,
                speakerCount: transcript.speakerCount,
                totalDurationMs,
            }, 'Transcription completed');
            return {
                success: true,
                transcript,
                metadata: {
                    sttProvider: sttProvider.id,
                    sttDurationMs,
                    diarizationProvider: diarizationProviderId,
                    diarizationDurationMs,
                    totalDurationMs,
                },
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.log.error({ mediaAssetId: mediaAsset.id, correlationId, error: message }, 'Transcription failed');
            return {
                success: false,
                error: {
                    code: 'TRANSCRIPTION_ERROR',
                    message,
                    stage: 'transcription',
                    retryable: true,
                },
                metadata: {
                    sttProvider: 'unknown',
                    sttDurationMs: 0,
                    totalDurationMs: Date.now() - startTime,
                },
            };
        }
    }
    /**
     * Build a Transcript from STT and diarization results
     */
    buildTranscript(mediaAsset, sttResult, diarizationResult, sttProvider, diarizationProvider) {
        const transcriptId = (0, hash_js_1.generateId)();
        const utterances = this.buildUtterances(transcriptId, sttResult.segments, diarizationResult);
        const participants = this.extractParticipants(utterances, diarizationResult?.speakers);
        const provenance = {
            sourceId: mediaAsset.id,
            sourceType: 'media_asset',
            ingestedAt: (0, time_js_1.now)(),
            ingestedBy: index_js_1.default.authorityId,
            transformChain: [
                {
                    step: 'stt',
                    timestamp: (0, time_js_1.now)(),
                    provider: sttProvider,
                    version: sttResult.modelVersion,
                    checksum: (0, hash_js_1.hashString)(sttResult.fullText),
                },
            ],
            originalChecksum: mediaAsset.checksum,
            currentChecksum: (0, hash_js_1.hashString)(JSON.stringify(utterances)),
        };
        if (diarizationResult && diarizationProvider) {
            provenance.transformChain.push({
                step: 'diarization',
                timestamp: (0, time_js_1.now)(),
                provider: diarizationProvider,
                version: diarizationResult.modelVersion,
            });
        }
        return {
            id: transcriptId,
            mediaAssetId: mediaAsset.id,
            format: 'json',
            language: sttResult.language,
            languages: sttResult.languages,
            utterances,
            participants,
            speakerCount: diarizationResult?.speakerCount || 1,
            wordCount: sttResult.wordCount,
            duration: sttResult.duration,
            confidence: sttResult.confidence,
            sttProvider,
            sttModelVersion: sttResult.modelVersion,
            diarizationProvider,
            diarizationModelVersion: diarizationResult?.modelVersion,
            rawContent: sttResult.fullText,
            provenance,
            policy: mediaAsset.policy,
            createdAt: (0, time_js_1.now)(),
        };
    }
    /**
     * Build utterances from STT segments with speaker attribution
     */
    buildUtterances(transcriptId, segments, diarizationResult) {
        const utterances = [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const speakerLabel = this.findSpeakerForSegment(segment.startTime, segment.endTime, diarizationResult);
            const utterance = {
                id: (0, hash_js_1.generateId)(),
                transcriptId,
                sequenceNumber: i,
                speakerLabel: speakerLabel || segment.speakerLabel,
                content: segment.text,
                language: segment.language,
                startTime: segment.startTime,
                endTime: segment.endTime,
                duration: segment.endTime - segment.startTime,
                confidence: segment.confidence,
                wordTimings: segment.words,
                createdAt: (0, time_js_1.now)(),
            };
            utterances.push(utterance);
        }
        return utterances;
    }
    /**
     * Find the dominant speaker for a time segment
     */
    findSpeakerForSegment(startTime, endTime, diarizationResult) {
        if (!diarizationResult)
            return undefined;
        const overlappingSpeakers = new Map();
        for (const segment of diarizationResult.segments) {
            // Calculate overlap
            const overlapStart = Math.max(startTime, segment.startTime);
            const overlapEnd = Math.min(endTime, segment.endTime);
            const overlap = Math.max(0, overlapEnd - overlapStart);
            if (overlap > 0) {
                const current = overlappingSpeakers.get(segment.speakerLabel) || 0;
                overlappingSpeakers.set(segment.speakerLabel, current + overlap);
            }
        }
        // Find speaker with most overlap
        let dominantSpeaker;
        let maxOverlap = 0;
        for (const [speaker, overlap] of overlappingSpeakers) {
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                dominantSpeaker = speaker;
            }
        }
        return dominantSpeaker;
    }
    /**
     * Extract participant references from utterances and speaker profiles
     */
    extractParticipants(utterances, speakerProfiles) {
        const participantMap = new Map();
        // Extract from utterances
        for (const utterance of utterances) {
            const label = utterance.speakerLabel;
            if (label && !participantMap.has(label)) {
                participantMap.set(label, {
                    id: (0, hash_js_1.generateId)(),
                    speakerId: label,
                    displayName: label,
                    role: 'participant',
                });
            }
        }
        // Enrich with speaker profiles
        if (speakerProfiles) {
            for (const profile of speakerProfiles) {
                const existing = participantMap.get(profile.label);
                if (existing) {
                    existing.confidence = profile.averageConfidence;
                    existing.metadata = {
                        estimatedGender: profile.estimatedGender,
                        speakingRatio: profile.speakingRatio,
                        totalDuration: profile.totalDuration,
                    };
                }
            }
        }
        return Array.from(participantMap.values());
    }
}
exports.TranscriptionService = TranscriptionService;
exports.transcriptionService = new TranscriptionService();
exports.default = exports.transcriptionService;
