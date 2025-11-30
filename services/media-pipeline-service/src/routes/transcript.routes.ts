/**
 * Transcript Routes
 *
 * API endpoints for transcript access and management.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TranscriptionRequest, Transcript } from '../types/media.js';
import { transcriptionService } from '../services/transcription.service.js';
import { segmentationService } from '../services/segmentation.service.js';
import { policyService } from '../services/policy.service.js';
import { logger } from '../utils/logger.js';
import { generateId } from '../utils/hash.js';
import { now } from '../utils/time.js';

// In-memory storage for demo purposes
const transcripts: Map<string, Transcript> = new Map();

export async function transcriptRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get a transcript by ID
   */
  fastify.get(
    '/api/v1/transcripts/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const transcript = transcripts.get(id);

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript ${id} not found`,
        });
      }

      return reply.status(200).send(transcript);
    }
  );

  /**
   * Get transcript by media asset ID
   */
  fastify.get(
    '/api/v1/media/:mediaId/transcript',
    async (request: FastifyRequest<{ Params: { mediaId: string } }>, reply: FastifyReply) => {
      const { mediaId } = request.params;

      const transcript = Array.from(transcripts.values()).find(
        (t) => t.mediaAssetId === mediaId
      );

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript for media asset ${mediaId} not found`,
        });
      }

      return reply.status(200).send(transcript);
    }
  );

  /**
   * Get utterances for a transcript
   */
  fastify.get(
    '/api/v1/transcripts/:id/utterances',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: {
          speaker?: string;
          startTime?: string;
          endTime?: string;
          keyTurnsOnly?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { speaker, startTime, endTime, keyTurnsOnly, limit = '100', offset = '0' } =
        request.query;

      const transcript = transcripts.get(id);

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript ${id} not found`,
        });
      }

      let utterances = [...transcript.utterances];

      // Apply filters
      if (speaker) {
        utterances = utterances.filter((u) => u.speakerLabel === speaker);
      }
      if (startTime) {
        const start = parseInt(startTime, 10);
        utterances = utterances.filter((u) => u.startTime >= start);
      }
      if (endTime) {
        const end = parseInt(endTime, 10);
        utterances = utterances.filter((u) => u.endTime <= end);
      }
      if (keyTurnsOnly === 'true') {
        utterances = utterances.filter((u) => u.isKeyTurn);
      }

      // Apply pagination
      const total = utterances.length;
      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);
      utterances = utterances.slice(offsetNum, offsetNum + limitNum);

      return reply.status(200).send({
        data: utterances,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total,
        },
      });
    }
  );

  /**
   * Get threads for a transcript
   */
  fastify.get(
    '/api/v1/transcripts/:id/threads',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const transcript = transcripts.get(id);

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript ${id} not found`,
        });
      }

      return reply.status(200).send({
        data: transcript.threads || [],
        total: transcript.threads?.length || 0,
      });
    }
  );

  /**
   * Get participants for a transcript
   */
  fastify.get(
    '/api/v1/transcripts/:id/participants',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const transcript = transcripts.get(id);

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript ${id} not found`,
        });
      }

      return reply.status(200).send({
        data: transcript.participants,
        total: transcript.participants.length,
      });
    }
  );

  /**
   * Re-segment a transcript
   */
  fastify.post(
    '/api/v1/transcripts/:id/segment',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          sessionGapThreshold?: number;
          minUtterancesPerThread?: number;
          enableKeyTurnDetection?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const transcript = transcripts.get(id);

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript ${id} not found`,
        });
      }

      const options = request.body || {};
      const result = segmentationService.segment(transcript, options);

      // Update transcript with new threads
      transcript.threads = result.threads;
      transcript.updatedAt = now();
      transcripts.set(id, transcript);

      return reply.status(200).send({
        threadCount: result.threads.length,
        keyTurnCount: result.keyTurns.length,
        sessionCount: result.sessions.length,
        processingTimeMs: result.metadata.processingTimeMs,
      });
    }
  );

  /**
   * Apply redaction to a transcript
   */
  fastify.post(
    '/api/v1/transcripts/:id/redact',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          ruleIds?: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const transcript = transcripts.get(id);

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript ${id} not found`,
        });
      }

      const { ruleIds } = request.body || {};
      const { redactedTranscript, event } = policyService.redactTranscript(
        transcript,
        ruleIds
      );

      // Update stored transcript
      transcripts.set(id, redactedTranscript);

      return reply.status(200).send({
        redactionsCount: event.redactionsCount,
        rulesApplied: event.rulesApplied,
        fieldTypes: event.fieldTypes,
      });
    }
  );

  /**
   * Export transcript in different formats
   */
  fastify.get(
    '/api/v1/transcripts/:id/export',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: {
          format?: 'json' | 'txt' | 'srt' | 'vtt';
          redacted?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { format = 'json', redacted = 'false' } = request.query;

      const transcript = transcripts.get(id);

      if (!transcript) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Transcript ${id} not found`,
        });
      }

      const useRedacted = redacted === 'true';

      switch (format) {
        case 'txt':
          const textContent = transcript.utterances
            .map((u) => {
              const content = useRedacted && u.contentRedacted ? u.contentRedacted : u.content;
              return `[${u.speakerLabel || 'Unknown'}]: ${content}`;
            })
            .join('\n\n');
          reply.header('Content-Type', 'text/plain');
          return reply.send(textContent);

        case 'srt':
          const srtContent = transcript.utterances
            .map((u, i) => {
              const content = useRedacted && u.contentRedacted ? u.contentRedacted : u.content;
              const startTime = formatSrtTime(u.startTime);
              const endTime = formatSrtTime(u.endTime);
              return `${i + 1}\n${startTime} --> ${endTime}\n${content}`;
            })
            .join('\n\n');
          reply.header('Content-Type', 'application/x-subrip');
          reply.header('Content-Disposition', `attachment; filename="${id}.srt"`);
          return reply.send(srtContent);

        case 'vtt':
          const vttContent =
            'WEBVTT\n\n' +
            transcript.utterances
              .map((u) => {
                const content = useRedacted && u.contentRedacted ? u.contentRedacted : u.content;
                const startTime = formatVttTime(u.startTime);
                const endTime = formatVttTime(u.endTime);
                return `${startTime} --> ${endTime}\n${content}`;
              })
              .join('\n\n');
          reply.header('Content-Type', 'text/vtt');
          reply.header('Content-Disposition', `attachment; filename="${id}.vtt"`);
          return reply.send(vttContent);

        case 'json':
        default:
          return reply.status(200).send(transcript);
      }
    }
  );

  // Register the transcript store for external access
  (fastify as any).transcriptStore = transcripts;
}

/**
 * Format milliseconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format milliseconds to WebVTT timestamp (HH:MM:SS.mmm)
 */
function formatVttTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}
