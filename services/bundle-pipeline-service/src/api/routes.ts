/**
 * API Routes for Bundle Pipeline Service
 * RESTful API for bundle and briefing management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Pool } from 'pg';
import type { Logger } from 'pino';
import {
  CreateEvidenceBundleRequestSchema,
  CreateClaimBundleRequestSchema,
  CreateBriefingPackageRequestSchema,
  BundleApprovalRequestSchema,
  type CreateEvidenceBundleRequest,
  type CreateClaimBundleRequest,
  type CreateBriefingPackageRequest,
  type BundleApprovalRequest,
  type PublishBundleRequest,
  type ScheduleBriefingRequest,
} from '../types/index.js';
import { BundleAssemblyService, type AssemblyContext } from '../services/BundleAssemblyService.js';
import { BriefingAssemblyService, type BriefingAssemblyContext } from '../services/BriefingAssemblyService.js';
import { PublishingService, type PublishContext } from '../services/PublishingService.js';
import { SchedulingService, type ScheduleCreateInput } from '../services/SchedulingService.js';
import { ProvenanceClient } from '../clients/ProvenanceClient.js';
import { CaseClient } from '../clients/CaseClient.js';
import { GovernanceClient } from '../clients/GovernanceClient.js';

export interface RouteServices {
  bundleAssembly: BundleAssemblyService;
  briefingAssembly: BriefingAssemblyService;
  publishing: PublishingService;
  scheduling: SchedulingService;
}

export async function registerRoutes(
  app: FastifyInstance,
  services: RouteServices,
  logger: Logger,
): Promise<void> {
  const routeLogger = logger.child({ component: 'routes' });

  // ============================================================================
  // Health Check
  // ============================================================================

  app.get('/health', async () => ({
    status: 'healthy',
    service: 'bundle-pipeline-service',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/ready', async () => ({
    status: 'ready',
    service: 'bundle-pipeline-service',
  }));

  // ============================================================================
  // Evidence Bundles
  // ============================================================================

  app.post<{
    Body: CreateEvidenceBundleRequest;
  }>('/api/v1/bundles/evidence', {
    schema: {
      description: 'Create a new evidence bundle',
      tags: ['evidence-bundles'],
      body: CreateEvidenceBundleRequestSchema,
    },
  }, async (request, reply) => {
    const context = extractContext(request);

    const result = await services.bundleAssembly.assembleEvidenceBundle(
      request.body,
      context,
    );

    if (!result.success) {
      return reply.status(400).send({
        error: 'Failed to create evidence bundle',
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    return reply.status(201).send({
      bundle: result.bundle,
      warnings: result.warnings,
      provenanceChainId: result.provenanceChainId,
    });
  });

  app.get<{
    Params: { id: string };
  }>('/api/v1/bundles/evidence/:id', async (request, reply) => {
    const { id } = request.params;
    const context = extractContext(request);

    const bundle = await services.bundleAssembly['repository'].getEvidenceBundle(id);

    if (!bundle) {
      return reply.status(404).send({ error: 'Evidence bundle not found' });
    }

    return reply.send({ bundle });
  });

  app.get<{
    Querystring: { caseId: string; tenantId: string };
  }>('/api/v1/bundles/evidence', async (request, reply) => {
    const { caseId, tenantId } = request.query;

    const bundles = await services.bundleAssembly['repository'].getEvidenceBundlesByCase(
      caseId,
      tenantId,
    );

    return reply.send({ bundles });
  });

  // ============================================================================
  // Claim Bundles
  // ============================================================================

  app.post<{
    Body: CreateClaimBundleRequest;
  }>('/api/v1/bundles/claims', {
    schema: {
      description: 'Create a new claim bundle',
      tags: ['claim-bundles'],
      body: CreateClaimBundleRequestSchema,
    },
  }, async (request, reply) => {
    const context = extractContext(request);

    const result = await services.bundleAssembly.assembleClaimBundle(
      request.body,
      context,
    );

    if (!result.success) {
      return reply.status(400).send({
        error: 'Failed to create claim bundle',
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    return reply.status(201).send({
      bundle: result.bundle,
      warnings: result.warnings,
      provenanceChainId: result.provenanceChainId,
    });
  });

  app.get<{
    Params: { id: string };
  }>('/api/v1/bundles/claims/:id', async (request, reply) => {
    const { id } = request.params;

    const bundle = await services.bundleAssembly['repository'].getClaimBundle(id);

    if (!bundle) {
      return reply.status(404).send({ error: 'Claim bundle not found' });
    }

    return reply.send({ bundle });
  });

  // ============================================================================
  // Briefing Packages
  // ============================================================================

  app.post<{
    Body: CreateBriefingPackageRequest;
  }>('/api/v1/briefings', {
    schema: {
      description: 'Create a new briefing package',
      tags: ['briefings'],
      body: CreateBriefingPackageRequestSchema,
    },
  }, async (request, reply) => {
    const context = extractBriefingContext(request);

    const result = await services.briefingAssembly.assembleBriefingPackage(
      request.body,
      context,
    );

    if (!result.success) {
      return reply.status(400).send({
        error: 'Failed to create briefing package',
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    return reply.status(201).send({
      briefing: result.briefing,
      warnings: result.warnings,
      provenanceChainId: result.provenanceChainId,
    });
  });

  app.get<{
    Params: { id: string };
  }>('/api/v1/briefings/:id', async (request, reply) => {
    const { id } = request.params;

    const briefing = await services.briefingAssembly['repository'].getBriefingPackage(id);

    if (!briefing) {
      return reply.status(404).send({ error: 'Briefing package not found' });
    }

    return reply.send({ briefing });
  });

  app.get<{
    Querystring: { caseId: string; tenantId: string };
  }>('/api/v1/briefings', async (request, reply) => {
    const { caseId, tenantId } = request.query;

    const briefings = await services.briefingAssembly['repository'].getBriefingPackagesByCase(
      caseId,
      tenantId,
    );

    return reply.send({ briefings });
  });

  // ============================================================================
  // Approvals
  // ============================================================================

  app.post<{
    Body: BundleApprovalRequest;
  }>('/api/v1/approvals', {
    schema: {
      description: 'Submit approval for a bundle',
      tags: ['approvals'],
      body: BundleApprovalRequestSchema,
    },
  }, async (request, reply) => {
    const { bundleId, bundleType, decision, comments, conditions } = request.body;
    const context = extractContext(request);

    const approval = {
      id: crypto.randomUUID(),
      approverId: context.userId,
      approverRole: 'approver', // Would come from auth context
      decision,
      comments,
      conditions,
      decidedAt: new Date().toISOString(),
    };

    let result;
    if (bundleType === 'briefing') {
      result = await services.briefingAssembly.addApproval(
        bundleId,
        approval,
        extractBriefingContext(request),
      );
    } else {
      result = await services.bundleAssembly.addApproval(
        bundleId,
        bundleType,
        approval,
        context,
      );
    }

    if (!result.success) {
      return reply.status(400).send({
        error: 'Failed to submit approval',
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      fullyApproved: result.fullyApproved,
    });
  });

  // ============================================================================
  // Publishing
  // ============================================================================

  app.post<{
    Body: PublishBundleRequest;
  }>('/api/v1/publish', {
    schema: {
      description: 'Publish a bundle',
      tags: ['publishing'],
    },
  }, async (request, reply) => {
    const context = extractPublishContext(request);

    const result = await services.publishing.publishBundle(request.body, context);

    if (!result.success) {
      return reply.status(400).send({
        error: 'Failed to publish bundle',
        errors: result.errors,
        deliveryResults: result.deliveryResults,
      });
    }

    return reply.send({
      success: true,
      bundleId: result.bundleId,
      publishedAt: result.publishedAt,
      archiveUri: result.archiveUri,
      archiveHash: result.archiveHash,
      deliveryResults: result.deliveryResults,
    });
  });

  app.post<{
    Params: { id: string };
    Body: { reason: string };
    Querystring: { bundleType: 'evidence' | 'claim' | 'briefing' };
  }>('/api/v1/bundles/:id/retract', async (request, reply) => {
    const { id } = request.params;
    const { bundleType } = request.query;
    const { reason } = request.body;
    const context = extractPublishContext(request);

    const result = await services.publishing.retractBundle(id, bundleType, reason, context);

    if (!result.success) {
      return reply.status(400).send({
        error: 'Failed to retract bundle',
        message: result.error,
      });
    }

    return reply.send({ success: true });
  });

  app.get<{
    Params: { id: string };
    Querystring: { bundleType: 'evidence' | 'claim' | 'briefing' };
  }>('/api/v1/bundles/:id/export', async (request, reply) => {
    const { id } = request.params;
    const { bundleType } = request.query;

    // Fetch bundle
    let bundle;
    switch (bundleType) {
      case 'evidence':
        bundle = await services.bundleAssembly['repository'].getEvidenceBundle(id);
        break;
      case 'claim':
        bundle = await services.bundleAssembly['repository'].getClaimBundle(id);
        break;
      case 'briefing':
        bundle = await services.briefingAssembly['repository'].getBriefingPackage(id);
        break;
    }

    if (!bundle) {
      return reply.status(404).send({ error: 'Bundle not found' });
    }

    // Generate archive
    const archive = await services.publishing.generateArchive(bundle, bundleType);

    return reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${archive.filename}"`)
      .header('X-Content-Hash', archive.contentHash)
      .send(archive.buffer);
  });

  // ============================================================================
  // Scheduling
  // ============================================================================

  app.post<{
    Body: ScheduleBriefingRequest;
  }>('/api/v1/schedules', {
    schema: {
      description: 'Create a scheduled briefing',
      tags: ['scheduling'],
    },
  }, async (request, reply) => {
    const context = extractContext(request);

    const input: ScheduleCreateInput = {
      caseId: request.body.caseId,
      tenantId: context.tenantId,
      briefingType: request.body.briefingType,
      templateId: request.body.templateId,
      schedule: request.body.schedule,
      deliveryChannels: request.body.deliveryChannels,
      recipients: request.body.recipients,
      createdBy: context.userId,
    };

    const job = await services.scheduling.createSchedule(input);

    return reply.status(201).send({ schedule: job });
  });

  app.get<{
    Querystring: { caseId: string; tenantId: string };
  }>('/api/v1/schedules', async (request, reply) => {
    const { caseId, tenantId } = request.query;

    const schedules = await services.scheduling.getSchedulesForCase(caseId, tenantId);

    return reply.send({ schedules });
  });

  app.get<{
    Params: { id: string };
  }>('/api/v1/schedules/:id', async (request, reply) => {
    const { id } = request.params;

    const schedule = await services.scheduling.getSchedule(id);

    if (!schedule) {
      return reply.status(404).send({ error: 'Schedule not found' });
    }

    return reply.send({ schedule });
  });

  app.post<{
    Params: { id: string };
  }>('/api/v1/schedules/:id/pause', async (request, reply) => {
    const { id } = request.params;

    const success = await services.scheduling.pauseSchedule(id);

    if (!success) {
      return reply.status(404).send({ error: 'Schedule not found or already paused' });
    }

    return reply.send({ success: true });
  });

  app.post<{
    Params: { id: string };
  }>('/api/v1/schedules/:id/resume', async (request, reply) => {
    const { id } = request.params;

    const success = await services.scheduling.resumeSchedule(id);

    if (!success) {
      return reply.status(404).send({ error: 'Schedule not found or not paused' });
    }

    return reply.send({ success: true });
  });

  app.delete<{
    Params: { id: string };
  }>('/api/v1/schedules/:id', async (request, reply) => {
    const { id } = request.params;

    const success = await services.scheduling.cancelSchedule(id);

    if (!success) {
      return reply.status(404).send({ error: 'Schedule not found' });
    }

    return reply.send({ success: true });
  });

  app.post<{
    Params: { id: string };
  }>('/api/v1/schedules/:id/trigger', async (request, reply) => {
    const { id } = request.params;
    const context = extractContext(request);

    const result = await services.scheduling.triggerImmediate(id, context.userId);

    if (!result.success) {
      return reply.status(400).send({
        error: 'Failed to trigger schedule',
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      briefingId: result.briefingId,
      executedAt: result.executedAt,
      duration: result.duration,
    });
  });

  app.get<{
    Params: { id: string };
    Querystring: { limit?: number };
  }>('/api/v1/schedules/:id/history', async (request, reply) => {
    const { id } = request.params;
    const { limit = 10 } = request.query;

    const history = await services.scheduling.getExecutionHistory(id, limit);

    return reply.send({ history });
  });

  routeLogger.info('API routes registered');
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractContext(request: FastifyRequest): AssemblyContext {
  // In production, extract from auth headers/JWT
  return {
    userId: (request.headers['x-user-id'] as string) || 'system',
    tenantId: (request.headers['x-tenant-id'] as string) || 'default',
    reason: (request.headers['x-request-reason'] as string) || 'API request',
    legalBasis: request.headers['x-legal-basis'] as string,
  };
}

function extractBriefingContext(request: FastifyRequest): BriefingAssemblyContext {
  return {
    userId: (request.headers['x-user-id'] as string) || 'system',
    tenantId: (request.headers['x-tenant-id'] as string) || 'default',
    reason: (request.headers['x-request-reason'] as string) || 'API request',
    legalBasis: request.headers['x-legal-basis'] as string,
  };
}

function extractPublishContext(request: FastifyRequest): PublishContext {
  return {
    userId: (request.headers['x-user-id'] as string) || 'system',
    tenantId: (request.headers['x-tenant-id'] as string) || 'default',
    reason: (request.headers['x-request-reason'] as string) || 'API request',
  };
}
