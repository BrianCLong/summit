/**
 * Data Factory Service - Quality Routes
 *
 * REST API endpoints for quality control and disagreement resolution.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ServiceContainer } from '../services/index.js';
import { Label } from '../types/index.js';

export function registerQualityRoutes(
  app: FastifyInstance,
  services: ServiceContainer
): void {
  // ============================================================================
  // Inter-Annotator Agreement
  // ============================================================================

  // Calculate overall agreement for dataset
  app.get('/datasets/:datasetId/quality/agreement', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };

    try {
      const agreement = await services.quality.calculateAgreement(datasetId);
      return reply.send(agreement);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Calculate Cohen's Kappa between two annotators
  app.get('/datasets/:datasetId/quality/kappa', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };
    const { annotator1, annotator2 } = request.query as {
      annotator1: string;
      annotator2: string;
    };

    if (!annotator1 || !annotator2) {
      return reply.status(400).send({
        error: 'Both annotator1 and annotator2 query parameters are required',
      });
    }

    try {
      const kappa = await services.quality.calculateCohenKappa(
        datasetId,
        annotator1,
        annotator2
      );
      return reply.send({ kappa, interpretation: interpretKappa(kappa) });
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Disagreement Resolution
  // ============================================================================

  // Get samples needing adjudication
  app.get('/datasets/:datasetId/quality/adjudication', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };
    const { threshold, limit } = request.query as {
      threshold?: string;
      limit?: string;
    };

    try {
      const samples = await services.quality.getSamplesNeedingAdjudication(
        datasetId,
        threshold ? parseFloat(threshold) : 0.5,
        limit ? parseInt(limit, 10) : 20
      );
      return reply.send(samples);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Resolve by majority vote
  app.post('/samples/:sampleId/quality/resolve/majority', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sampleId } = request.params as { sampleId: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const labelSet = await services.quality.resolveByMajorityVote(
        sampleId,
        userId
      );
      if (!labelSet) {
        return reply.status(400).send({
          error: 'Unable to determine majority. Manual adjudication required.',
        });
      }
      return reply.send(labelSet);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Resolve by expert review
  app.post('/samples/:sampleId/quality/resolve/expert', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sampleId } = request.params as { sampleId: string };
    const { expertLabel } = request.body as { expertLabel: Label[] };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    if (!expertLabel || !Array.isArray(expertLabel)) {
      return reply.status(400).send({ error: 'expertLabel is required' });
    }

    try {
      const labelSet = await services.quality.resolveByExpertReview(
        sampleId,
        expertLabel,
        userId
      );
      return reply.send(labelSet);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Golden Questions
  // ============================================================================

  // Evaluate golden question response
  app.post('/samples/:sampleId/quality/golden/evaluate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sampleId } = request.params as { sampleId: string };
    const { labelSetId } = request.body as { labelSetId: string };

    try {
      const labelSet = await services.labeling.getLabelSet(labelSetId);
      if (!labelSet) {
        return reply.status(404).send({ error: 'Label set not found' });
      }

      const result = await services.quality.evaluateGoldenResponse(
        sampleId,
        labelSet
      );
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Quality Reports
  // ============================================================================

  // Generate quality report
  app.get('/datasets/:datasetId/quality/report', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };

    try {
      const report = await services.quality.generateQualityReport(datasetId);
      return reply.send(report);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

function interpretKappa(kappa: number): string {
  if (kappa < 0) return 'Poor (less than chance)';
  if (kappa < 0.2) return 'Slight agreement';
  if (kappa < 0.4) return 'Fair agreement';
  if (kappa < 0.6) return 'Moderate agreement';
  if (kappa < 0.8) return 'Substantial agreement';
  return 'Almost perfect agreement';
}
