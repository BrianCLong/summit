"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingService = void 0;
exports.createReportingService = createReportingService;
const ledger_js_1 = require("../provenance/ledger.js");
const delivery_service_js_1 = require("./delivery-service.js");
const index_js_1 = require("./exporters/index.js");
const template_engine_js_1 = require("./template-engine.js");
const version_store_js_1 = require("./version-store.js");
const validation_js_1 = require("./validation.js");
class ReportingService {
    accessControl;
    delivery;
    versions;
    templateEngine;
    constructor(accessControl, delivery, versions, templateEngine = template_engine_js_1.defaultTemplateEngine) {
        this.accessControl = accessControl;
        this.delivery = delivery;
        this.versions = versions;
        this.templateEngine = templateEngine;
    }
    async generate(request, access) {
        const validatedRequest = (0, validation_js_1.validateReportRequest)(request);
        this.accessControl.ensureAuthorized(access, 'report', 'view');
        if (validatedRequest.recipients) {
            this.accessControl.ensureAuthorized(access, 'report', 'deliver');
        }
        const renderResult = this.templateEngine.render(validatedRequest.template, validatedRequest.context);
        const exporter = index_js_1.exporterMap[validatedRequest.template.format];
        if (!exporter)
            throw new Error(`No exporter for format ${validatedRequest.template.format}`);
        let prepared = renderResult.rendered;
        try {
            prepared = JSON.parse(renderResult.rendered);
        }
        catch {
            prepared = renderResult.rendered;
        }
        const artifact = await exporter.export(prepared, {
            watermark: validatedRequest.watermark || validatedRequest.template.defaultWatermark,
            title: validatedRequest.template.name,
        });
        const version = this.recordVersion(validatedRequest.template, artifact, access.userId);
        // Audit Logging
        await ledger_js_1.provenanceLedger.appendEntry({
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
            await ledger_js_1.provenanceLedger.appendEntry({
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
    recordVersion(template, artifact, userId) {
        return this.versions.record(template, artifact, userId);
    }
    history(templateId) {
        return this.versions.history(templateId);
    }
}
exports.ReportingService = ReportingService;
function createReportingService(rules) {
    return new ReportingService(rules, new delivery_service_js_1.DeliveryService(), new version_store_js_1.VersionStore());
}
