"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const globals_1 = require("@jest/globals");
const access_control_js_1 = require("../access-control.js");
const delivery_service_js_1 = require("../delivery-service.js");
const template_engine_js_1 = require("../template-engine.js");
const scheduler_js_1 = require("../scheduler.js");
const service_js_1 = require("../service.js");
const version_store_js_1 = require("../version-store.js");
const ledger_js_1 = require("../../provenance/ledger.js");
const node_cron_1 = __importDefault(require("node-cron"));
globals_1.jest.mock('axios');
const mockedAxios = axios_1.default;
const baseTemplate = {
    id: 'tpl-1',
    name: 'Executive Threat Brief',
    format: 'json',
    content: '{"entries": [ { "name": "alpha", "score": 95 } ]}',
};
const access = { userId: 'u-1', roles: ['analyst'] };
const rules = [
    { resource: 'report', action: 'view', roles: ['analyst', 'admin'] },
    { resource: 'report', action: 'deliver', roles: ['analyst', 'admin'] },
];
const noDeliverAccess = { userId: 'u-2', roles: ['viewer'] };
const limitedRules = [
    { resource: 'report', action: 'view', roles: ['viewer', 'analyst', 'admin'] },
    { resource: 'report', action: 'deliver', roles: ['analyst', 'admin'] },
];
function createService(customRules = rules) {
    const transporter = {
        sendMail: globals_1.jest.fn().mockImplementation(async () => ({ messageId: 'm-1' })),
    };
    const delivery = new delivery_service_js_1.DeliveryService(transporter);
    const accessControl = new access_control_js_1.AccessControlService(customRules);
    const versions = new version_store_js_1.VersionStore();
    const engine = new template_engine_js_1.TemplateEngine();
    return { delivery, accessControl, versions, engine, service: new service_js_1.ReportingService(accessControl, delivery, versions, engine) };
}
describe('TemplateEngine', () => {
    it('renders Jinja-style filters', () => {
        const engine = new template_engine_js_1.TemplateEngine();
        const template = {
            ...baseTemplate,
            format: 'txt',
            content: 'Hello {{ name | uppercase }}',
        };
        const result = engine.render(template, { name: 'summit' });
        expect(result.rendered).toContain('SUMMIT');
    });
});
describe('ReportingService', () => {
    beforeEach(() => {
        globals_1.jest.spyOn(ledger_js_1.provenanceLedger, 'appendEntry').mockResolvedValue(undefined);
    });
    it('generates artifacts, records versions, and delivers to multiple channels', async () => {
        mockedAxios.post.mockResolvedValue({ status: 200 });
        const { service, versions, delivery } = createService();
        const request = {
            template: baseTemplate,
            context: {},
            watermark: 'SUMMIT CONFIDENTIAL',
            recipients: {
                channels: ['email', 'slack', 'webhook'],
                email: { to: ['ops@summit.local'], subject: 'Daily Brief' },
                slack: { webhookUrl: 'https://hooks.slack.com/services/demo', text: 'Brief ready' },
                webhook: { url: 'https://api.summit.local/webhooks/report', payload: { channel: 'exec' } },
            },
        };
        const artifact = await service.generate(request, access);
        expect(artifact.format).toBe('json');
        const payload = JSON.parse(artifact.buffer.toString());
        expect(payload.watermark).toBe('SUMMIT CONFIDENTIAL');
        expect(versions.history(baseTemplate.id)).toHaveLength(1);
        expect(delivery['transporter'].sendMail).toHaveBeenCalled();
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        expect(artifact.metadata?.delivery).toBeDefined();
    });
    it('rejects delivery attempts without sufficient role', async () => {
        const { service } = createService(limitedRules);
        const request = {
            template: baseTemplate,
            context: {},
            recipients: { channels: ['email'], email: { to: ['ops@summit.local'] } },
        };
        await expect(service.generate(request, noDeliverAccess)).rejects.toThrow(/not permitted to deliver report/);
    });
    it('validates delivery configuration matches requested channels', async () => {
        const accessControl = new access_control_js_1.AccessControlService(limitedRules);
        const versions = new version_store_js_1.VersionStore();
        const delivery = new delivery_service_js_1.DeliveryService({ sendMail: globals_1.jest.fn() });
        const service = new service_js_1.ReportingService(accessControl, delivery, versions, new template_engine_js_1.TemplateEngine());
        const badRequest = {
            template: baseTemplate,
            context: {},
            recipients: { channels: ['email'] },
        };
        await expect(service.generate(badRequest, access)).rejects.toThrow(/email delivery config/);
    });
});
describe('ReportScheduler', () => {
    beforeEach(() => {
        globals_1.jest.spyOn(node_cron_1.default, 'validate').mockReturnValue(true);
    });
    it('registers and cancels cron-driven jobs', () => {
        const { service } = createService();
        const scheduler = new scheduler_js_1.ReportScheduler(service);
        const job = {
            id: 'job-1',
            name: 'hourly-threat-watch',
            cron: '*/5 * * * *',
            request: { template: baseTemplate, context: {} },
        };
        scheduler.schedule(job, access);
        expect(scheduler.activeJobs()).toContain('job-1');
        scheduler.cancel('job-1');
        expect(scheduler.activeJobs()).not.toContain('job-1');
    });
    it('rejects invalid cron expressions', () => {
        const { service } = createService();
        const scheduler = new scheduler_js_1.ReportScheduler(service);
        const badJob = {
            id: 'bad',
            name: 'invalid',
            cron: 'not-a-cron',
            request: { template: baseTemplate, context: {} },
        };
        node_cron_1.default.validate.mockReturnValueOnce(false);
        expect(() => scheduler.schedule(badJob, access)).toThrow(/Invalid cron expression/);
    });
});
