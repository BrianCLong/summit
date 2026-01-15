import { randomUUID } from 'crypto';
import logger from '../../utils/logger.js';
import { tenantService } from '../TenantService.js';
import { demoTenantTemplate } from './seed/demoTenantTemplate.js';
import { demoWorkflowSeed } from './seed/demoWorkflowSeed.js';
import { investigationWorkflowService } from '../investigationWorkflowService.js';
import { advancedAuditSystem } from '../../audit/index.js';

export interface DemoTenantBootstrapResult {
  tenantId: string;
  slug: string;
  workflows: string[];
  evidenceSeed: {
    events: number;
    windowStart: string;
    windowEnd: string;
  };
}

export class DemoTenantBootstrapService {
  async bootstrap(actorId: string): Promise<DemoTenantBootstrapResult> {
    const tenant = await tenantService.createTenant(
      demoTenantTemplate.tenant,
      actorId,
    );

    await tenantService.updateSettings(
      tenant.id,
      demoTenantTemplate.settings,
      actorId,
    );

    const workflows: string[] = [];

    for (const seed of demoWorkflowSeed) {
      const investigation = await investigationWorkflowService.createInvestigation(
        seed.templateId,
        {
          tenantId: tenant.id,
          name: seed.name,
          description: seed.description,
          priority: seed.priority,
          assignedTo: [actorId],
          createdBy: actorId,
          tags: seed.tags,
        },
      );
      workflows.push(investigation.id);
    }

    const evidenceSeed = await this.seedEvidence(tenant.id, actorId, workflows);

    logger.info(
      {
        tenantId: tenant.id,
        workflows,
        evidenceSeed,
      },
      'Demo tenant bootstrap complete',
    );

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      workflows,
      evidenceSeed,
    };
  }

  private async seedEvidence(
    tenantId: string,
    actorId: string,
    workflowIds: string[],
  ) {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 6 * 60 * 60 * 1000);

    const events = [
      {
        eventType: 'user_action' as const,
        action: 'demo_tenant_bootstrap',
        message: 'Demo tenant bootstrap executed.',
      },
      {
        eventType: 'resource_modify' as const,
        action: 'demo_workflow_seeded',
        message: 'Demo investigation workflows seeded.',
      },
    ];

    for (const event of events) {
      await advancedAuditSystem.recordEvent({
        eventType: event.eventType,
        level: 'info',
        correlationId: randomUUID(),
        tenantId,
        serviceId: 'demo-tenant-bootstrap',
        resourceType: 'investigation',
        resourceId: workflowIds[0] ?? tenantId,
        userId: actorId,
        action: event.action,
        outcome: 'success',
        message: event.message,
        details: {
          tenantId,
          workflowIds,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
        },
        complianceRelevant: true,
        complianceFrameworks: ['SOC2', 'ISO27001'],
      });
    }

    return {
      events: events.length,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    };
  }
}

export const demoTenantBootstrapService = new DemoTenantBootstrapService();
