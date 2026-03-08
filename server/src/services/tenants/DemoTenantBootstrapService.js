"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoTenantBootstrapService = exports.DemoTenantBootstrapService = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const TenantService_js_1 = require("../TenantService.js");
const demoTenantTemplate_js_1 = require("./seed/demoTenantTemplate.js");
const demoWorkflowSeed_js_1 = require("./seed/demoWorkflowSeed.js");
const investigationWorkflowService_js_1 = require("../investigationWorkflowService.js");
const index_js_1 = require("../../audit/index.js");
class DemoTenantBootstrapService {
    async bootstrap(actorId) {
        const tenant = await TenantService_js_1.tenantService.createTenant(demoTenantTemplate_js_1.demoTenantTemplate.tenant, actorId);
        await TenantService_js_1.tenantService.updateSettings(tenant.id, demoTenantTemplate_js_1.demoTenantTemplate.settings, actorId);
        const workflows = [];
        for (const seed of demoWorkflowSeed_js_1.demoWorkflowSeed) {
            const investigation = await investigationWorkflowService_js_1.investigationWorkflowService.createInvestigation(seed.templateId, {
                tenantId: tenant.id,
                name: seed.name,
                description: seed.description,
                priority: seed.priority,
                assignedTo: [actorId],
                createdBy: actorId,
                tags: seed.tags,
            });
            workflows.push(investigation.id);
        }
        const evidenceSeed = await this.seedEvidence(tenant.id, actorId, workflows);
        logger_js_1.default.info({
            tenantId: tenant.id,
            workflows,
            evidenceSeed,
        }, 'Demo tenant bootstrap complete');
        return {
            tenantId: tenant.id,
            slug: tenant.slug,
            workflows,
            evidenceSeed,
        };
    }
    async seedEvidence(tenantId, actorId, workflowIds) {
        const windowEnd = new Date();
        const windowStart = new Date(windowEnd.getTime() - 6 * 60 * 60 * 1000);
        const events = [
            {
                eventType: 'user_action',
                action: 'demo_tenant_bootstrap',
                message: 'Demo tenant bootstrap executed.',
            },
            {
                eventType: 'resource_modify',
                action: 'demo_workflow_seeded',
                message: 'Demo investigation workflows seeded.',
            },
        ];
        for (const event of events) {
            await index_js_1.advancedAuditSystem.recordEvent({
                eventType: event.eventType,
                level: 'info',
                correlationId: (0, crypto_1.randomUUID)(),
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
exports.DemoTenantBootstrapService = DemoTenantBootstrapService;
exports.demoTenantBootstrapService = new DemoTenantBootstrapService();
