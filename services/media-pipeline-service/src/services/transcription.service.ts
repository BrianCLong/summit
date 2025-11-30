/**
 * Transcription Service
 *
 * Orchestrates STT and diarization to produce transcripts with speaker attribution.
 */

import { v4 as uuid } from 'uuid';
import type {
  MediaAsset,
  Transcript,
  Utterance,
  ParticipantRef,
  TranscriptFormat,
  Provenance,
} from '../types/media.js';
import type {
  STTResult,
  STTSegment,
  DiarizationResult,
  SpeakerProfile,
} from '../types/providers.js';
import { providerRegistry } from '../providers/registry.js';
import { logger, createChildLogger } from '../utils/logger.js';
import { hashString, generateId } from '../utils/hash.js';
import { now } from '../utils/time.js';
import config from '../config/index.js';

export interface TranscriptionOptions {
  provider?: string;
  language?: string;
  enableDiarization?: boolean;
  enableWordTimings?: boolean;
  vocabularyHints?: string[];
  expectedSpeakerCount?: number;
}

export interface TranscriptionResult {
  success: boolean;
  transcript?: Transcript;
  error?: {
    code: string;
    message: string;
    stage: string;
    retryable: boolean;
  };
  metadata: {
    sttProvider: string;
    sttDurationMs: number;
    diarizationProvider?: string;
    diarizationDurationMs?: number;
    totalDurationMs: number;
  };
}

export class TranscriptionService {
  private log = createChildLogger({ service: 'TranscriptionService' });

  /**
   * Transcribe a media asset
   */
  async transcribe(
    mediaAsset: MediaAsset,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const correlationId = generateId();

    this.log.info(
      { mediaAssetId: mediaAsset.id, correlationId, options },
      'Starting transcription'
    );

    try {
      // Select STT provider
      const sttSelection = await providerRegistry.selectSTTProvider(mediaAsset, {
        language: options.language,
      });
      const sttProvider = providerRegistry.getSTTProvider(
        options.provider || sttSelection.providerId
      );

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
      let diarizationResult: DiarizationResult | undefined;
      let diarizationDurationMs: number | undefined;
      let diarizationProviderId: string | undefined;

      if (options.enableDiarization !== false) {
        const diarizationSelection = await providerRegistry.selectDiarizationProvider(mediaAsset, {
          expectedSpeakers: options.expectedSpeakerCount,
        });
        const diarizationProvider = providerRegistry.getDiarizationProvider(
          diarizationSelection.providerId
        );

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
      const transcript = this.buildTranscript(
        mediaAsset,
        sttResult,
        diarizationResult,
        sttProvider.id,
        diarizationProviderId
      );

      const totalDurationMs = Date.now() - startTime;

      this.log.info(
        {
          mediaAssetId: mediaAsset.id,
          transcriptId: transcript.id,
          correlationId,
          utteranceCount: transcript.utterances.length,
          speakerCount: transcript.speakerCount,
          totalDurationMs,
        },
        'Transcription completed'
      );

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
    } catch (error) {
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
  private buildTranscript(
    mediaAsset: MediaAsset,
    sttResult: STTResult,
    diarizationResult: DiarizationResult | undefined,
    sttProvider: string,
    diarizationProvider?: string
  ): Transcript {
    const transcriptId = generateId();
    const utterances = this.buildUtterances(
      transcriptId,
      sttResult.segments,
      diarizationResult
    );

    const participants = this.extractParticipants(utterances, diarizationResult?.speakers);

    const provenance: Provenance = {
      sourceId: mediaAsset.id,
      sourceType: 'media_asset',
      ingestedAt: now(),
      ingestedBy: config.authorityId,
      transformChain: [
        {
          step: 'stt',
          timestamp: now(),
          provider: sttProvider,
          version: sttResult.modelVersion,
          checksum: hashString(sttResult.fullText),
        },
      ],
      originalChecksum: mediaAsset.checksum,
      currentChecksum: hashString(JSON.stringify(utterances)),
    };

    if (diarizationResult && diarizationProvider) {
      provenance.transformChain.push({
        step: 'diarization',
        timestamp: now(),
        provider: diarizationProvider,
        version: diarizationResult.modelVersion,
      });
    }

    return {
      id: transcriptId,
      mediaAssetId: mediaAsset.id,
      format: 'json' as TranscriptFormat,
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
      createdAt: now(),
    };
  }

  /**
   * Build utterances from STT segments with speaker attribution
   */
  private buildUtterances(
    transcriptId: string,
    segments: STTSegment[],
    diarizationResult?: DiarizationResult
  ): Utterance[] {
    const utterances: Utterance[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const speakerLabel = this.findSpeakerForSegment(
        segment.startTime,
        segment.endTime,
        diarizationResult
      );

      const utterance: Utterance = {
        id: generateId(),
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
        createdAt: now(),
      };

      utterances.push(utterance);
    }

    return utterances;
  }

  /**
   * Find the dominant speaker for a time segment
   */
  private findSpeakerForSegment(
    startTime: number,
    endTime: number,
    diarizationResult?: DiarizationResult
  ): string | undefined {
    if (!diarizationResult) return undefined;

    const overlappingSpeakers: Map<string, number> = new Map();

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
    let dominantSpeaker: string | undefined;
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
  private extractParticipants(
    utterances: Utterance[],
    speakerProfiles?: SpeakerProfile[]
  ): ParticipantRef[] {
    const participantMap: Map<string, ParticipantRef> = new Map();

    // Extract from utterances
    for (const utterance of utterances) {
      const label = utterance.speakerLabel;
      if (label && !participantMap.has(label)) {
        participantMap.set(label, {
          id: generateId(),
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

export const transcriptionService = new TranscriptionService();
export default transcriptionService;
