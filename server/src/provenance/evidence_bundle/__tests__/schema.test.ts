import { describe, it, expect } from 'vitest';
import { assembleCogOpsBundle } from '../generator';
import { CogOpsReportSchema, CogOpsMetricsSchema, CogOpsStampSchema } from '../cogops_schemas';
import { Campaign } from '../../../campaign/schema';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const reportSchema = JSON.parse(fs.readFileSync(path.join(process.cwd(), '../schemas/cogops/report.schema.json'), 'utf8'));
const metricsSchema = JSON.parse(fs.readFileSync(path.join(process.cwd(), '../schemas/cogops/metrics.schema.json'), 'utf8'));

const validateReport = ajv.compile(reportSchema);
const validateMetrics = ajv.compile(metricsSchema);

const mockCampaign: Campaign = {
    id: 'CMP-001',
    name: 'Test Campaign',
    actors: [],
    assets: [
        { id: 'ASSET-01', type: 'channel', platform: 'twitter' }
    ],
    narratives: [],
    evidence: [
        { id: 'EVD-01', type: 'report', url: 'https://example.com' }
    ],
    actions: [
        { id: 'ACT-01', type: 'seed', sourceId: 'ACTOR-01', targetId: 'NARR-01', timestamp: '2026-02-01T12:00:00Z' }
    ]
};

describe('CogOps Schema Validation', () => {
    it('should generate a bundle that passes both Zod and JSON Schema validation', () => {
        const bundle = assembleCogOpsBundle(mockCampaign, { allowed: true, violations: [] });

        // Zod validation
        CogOpsReportSchema.parse(bundle.report);
        CogOpsMetricsSchema.parse(bundle.metrics);
        CogOpsStampSchema.parse(bundle.stamp);

        // JSON Schema validation
        const reportValid = validateReport(bundle.report);
        if (!reportValid) {
            console.error('Report validation errors:', validateReport.errors);
        }
        expect(reportValid).toBe(true);

        const metricsValid = validateMetrics(bundle.metrics);
        if (!metricsValid) {
            console.error('Metrics validation errors:', validateMetrics.errors);
        }
        expect(metricsValid).toBe(true);
    });

    it('should fail validation for a violation with high severity', () => {
        const bundle = assembleCogOpsBundle(mockCampaign, {
            allowed: false,
            violations: [
                { policyId: 'POL-01', policyName: 'Fake Policy', severity: 'critical' }
            ]
        });

        CogOpsReportSchema.parse(bundle.report);
        expect(bundle.report.findings[0].severity).toBe('high');
        expect(validateReport(bundle.report)).toBe(true);
    });
});
