"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ingestion_processor_js_1 = require("../processors/ingestion.processor.js");
const report_processor_js_1 = require("../processors/report.processor.js");
const analytics_processor_js_1 = require("../processors/analytics.processor.js");
const notification_processor_js_1 = require("../processors/notification.processor.js");
const webhook_processor_js_1 = require("../processors/webhook.processor.js");
(0, globals_1.describe)('Job Processors', () => {
    (0, globals_1.describe)('ingestionProcessor', () => {
        (0, globals_1.it)('should process job successfully', async () => {
            const job = { id: '1', data: {} };
            const result = await (0, ingestion_processor_js_1.ingestionProcessor)(job);
            (0, globals_1.expect)(result).toHaveProperty('processed', true);
        });
    });
    (0, globals_1.describe)('reportProcessor', () => {
        (0, globals_1.it)('should generate report url', async () => {
            const job = { id: '2', data: {} };
            const result = await (0, report_processor_js_1.reportProcessor)(job);
            (0, globals_1.expect)(result).toHaveProperty('reportUrl');
            (0, globals_1.expect)(result.reportUrl).toContain('2.pdf');
        });
    });
    (0, globals_1.describe)('analyticsProcessor', () => {
        (0, globals_1.it)('should return metrics', async () => {
            const job = { id: '3', data: {} };
            const result = await (0, analytics_processor_js_1.analyticsProcessor)(job);
            (0, globals_1.expect)(result).toHaveProperty('metrics');
        });
    });
    (0, globals_1.describe)('notificationProcessor', () => {
        (0, globals_1.it)('should send notification', async () => {
            const job = { id: '4', data: { to: 'test@example.com' } };
            const result = await (0, notification_processor_js_1.notificationProcessor)(job);
            (0, globals_1.expect)(result).toEqual({ sent: true });
        });
    });
    (0, globals_1.describe)('webhookProcessor', () => {
        (0, globals_1.it)('should process webhook', async () => {
            const job = { id: '5', data: { event: 'ping' } };
            const result = await (0, webhook_processor_js_1.webhookProcessor)(job);
            (0, globals_1.expect)(result).toEqual({ status: 'processed' });
        });
    });
});
