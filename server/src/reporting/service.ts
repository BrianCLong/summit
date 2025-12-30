import { provenanceLedger } from '../provenance/ledger.js';
import { AccessControlService } from './access-control.js';
import { DeliveryService } from './delivery-service.js';
import { exporterMap } from './exporters/index.js';
import { TemplateEngine, defaultTemplateEngine } from './template-engine.js';
import {
  AccessContext,
  ReportArtifact,
  ReportRequest,
  ReportTemplate,
  ReportVersion,
} from './types';
import { VersionStore } from './version-store';
import { validateReportRequest } from './validation';

export class ReportingService {
  constructor(
    private readonly accessControl: AccessControlService,
    private readonly delivery: DeliveryService,
    private readonly versions: VersionStore,
    private readonly templateEngine: TemplateEngine = defaultTemplateEngine,
  ) { }

  async generate(request: ReportRequest, access: AccessContext): Promise<ReportArtifact> {
    const validatedRequest = validateReportRequest(request);
    this.accessControl.ensureAuthorized(access, 'report', 'view');
    if (validatedRequest.recipients) {
      this.accessControl.ensureAuthorized(access, 'report', 'deliver');
    }

    const renderResult = this.templateEngine.render(
      validatedRequest.template,
      validatedRequest.context,
    );
    const exporter = exporterMap[validatedRequest.template.format];
    if (!exporter) throw new Error(`No exporter for format ${validatedRequest.template.format}`);

    let prepared: unknown = renderResult.rendered;
    try {
      prepared = JSON.parse(renderResult.rendered);
    } catch {
      prepared = renderResult.rendered;
    }

    const artifact = await exporter.export(prepared, {
      watermark: validatedRequest.watermark || validatedRequest.template.defaultWatermark,
      title: validatedRequest.template.name,
    });

    const version = this.recordVersion(validatedRequest.template, artifact, access.userId);

    // Audit Logging
    await provenanceLedger.appendEntry({
      tenantId: 'system', // TODO: extract from access context if available
      actionType: 'REPORT_GENERATED',
      resourceType: 'Report',
      resourceId: version.id,
      actorId: access.userId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'CREATE',
        entityId: version.id,
        entityType: 'Report',
        templateId: validatedRequest.template.id,
        format: validatedRequest.template.format,
        watermark: validatedRequest.watermark,
      },
      metadata: {
        versionChecksum: version.checksum,
      },
    });

    const delivery = await this.delivery.deliver(artifact, validatedRequest.recipients);

    if (delivery) {
      await provenanceLedger.appendEntry({
        tenantId: 'system', // TODO: extract from access context if available
        actionType: 'REPORT_DELIVERED',
        resourceType: 'Report',
        resourceId: version.id,
        actorId: access.userId,
        actorType: 'user',
        timestamp: new Date(),
        payload: {
          mutationType: 'UPDATE', // Delivery is an update to the report's lifecycle
          entityId: version.id,
          entityType: 'Report',
          delivery,
        },
        metadata: {
          versionChecksum: version.checksum,
        },
      });
    }

    artifact.metadata = {
      ...(artifact.metadata || {}),
      versionId: version.id,
      deliveredAt: delivery ? new Date().toISOString() : undefined,
      delivery,
    };
    return artifact;
  }

  recordVersion(template: ReportTemplate, artifact: ReportArtifact, userId: string): ReportVersion {
    return this.versions.record(template, artifact, userId);
  }

  history(templateId: string): ReportVersion[] {
    return this.versions.history(templateId);
  }
}

export function createReportingService(rules: AccessControlService): ReportingService {
  return new ReportingService(rules, new DeliveryService(), new VersionStore());
}
