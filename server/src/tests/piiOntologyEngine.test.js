"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const piiOntologyEngine_js_1 = require("../privacy/piiOntologyEngine.js");
(0, globals_1.describe)('PiiOntologyEngine', () => {
    let engine;
    let trainingSamples;
    (0, globals_1.beforeAll)(() => {
        engine = new piiOntologyEngine_js_1.PiiOntologyEngine({
            detectionThreshold: 0.5,
            contextualThreshold: 0.25,
            enrichment: {
                highRiskThreshold: 0.5,
                criticalRiskThreshold: 0.85,
            },
        });
        engine.registerPattern({
            id: 'email',
            description: 'Email address detection',
            regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
            categories: ['CONTACT'],
            confidenceBoost: 0.2,
        });
        engine.registerPattern({
            id: 'phone',
            description: 'North American phone number detection',
            regex: /(\+1[ \-]?)?\(?\d{3}\)?[ \-]?\d{3}[ \-]?\d{4}/,
            categories: ['CONTACT'],
            confidenceBoost: 0.1,
        });
        engine.registerPattern({
            id: 'ssn',
            description: 'US Social Security Number',
            regex: /\b\d{3}-\d{2}-\d{4}\b/,
            categories: ['IDENTIFIER', 'FINANCIAL'],
            confidenceBoost: 0.3,
        });
        trainingSamples = [
            {
                value: 'alice@example.com',
                context: 'customer contact email',
                categories: ['CONTACT'],
            },
            {
                value: 'bob@example.org',
                context: 'user email login',
                categories: ['CONTACT'],
            },
            {
                value: 'Account balance: 1520',
                context: 'financial summary report',
                categories: ['FINANCIAL'],
            },
            {
                value: 'General system notification',
                context: 'anonymous event log',
                categories: [],
            },
            {
                value: 'Patient has diabetes diagnosis',
                context: 'clinical health record',
                categories: ['HEALTH'],
            },
        ];
        engine.train(trainingSamples);
    });
    (0, globals_1.it)('classifies and enriches PII entities with regulatory mappings', async () => {
        const records = [
            {
                id: '1',
                value: 'alice@example.com',
                context: {
                    system: 'crm',
                    field: 'primaryEmail',
                    description: 'Customer contact email',
                    tags: ['customer', 'contact'],
                    owner: 'sales-ops',
                    retentionPolicy: '3 years',
                    lineage: {
                        path: ['crm', 'contacts', 'primaryEmail'],
                        transformations: ['normalized', 'lowercased'],
                    },
                    accessControls: ['crm-admin', 'crm-support'],
                },
            },
            {
                id: '2',
                value: 'Patient expresses concerns about chronic asthma',
                context: {
                    system: 'ehr',
                    field: 'clinicalNotes',
                    description: 'Physician health notes',
                    collection: 'notes',
                    owner: 'care-team',
                    tags: ['clinical', 'protected'],
                    retentionPolicy: '7 years',
                    lineage: {
                        path: ['ehr', 'encounters', 'clinicalNotes'],
                        transformations: ['de-identified for analytics'],
                    },
                    accessControls: ['hipaa-compliant-zone'],
                },
            },
            {
                id: '3',
                value: 'Customer ID: 554-22-9841',
                context: {
                    system: 'payments',
                    field: 'customerIdentifier',
                    description: 'Billing identifier reference',
                    owner: 'finance',
                    tags: ['payment', 'billing'],
                    retentionPolicy: 'PCI retention policy',
                    accessControls: ['pci-segment'],
                },
            },
            {
                id: '4',
                value: '555-222-3333',
                context: {
                    system: 'support',
                    field: 'callbackNumber',
                    description: 'Support phone contact for case',
                    tags: ['callback'],
                    owner: 'support',
                    retentionPolicy: '1 year',
                },
            },
        ];
        const report = await engine.processRecords(records);
        (0, globals_1.expect)(report.summary.totalRecords).toBe(records.length);
        (0, globals_1.expect)(report.summary.piiRecords).toBeGreaterThanOrEqual(3);
        const emailEntity = report.entities.find((entity) => entity.recordId === '1');
        (0, globals_1.expect)(emailEntity).toBeDefined();
        (0, globals_1.expect)(emailEntity?.categories).toContain('CONTACT');
        (0, globals_1.expect)(emailEntity?.metadata.recommendedControls).toEqual(globals_1.expect.arrayContaining(['Encrypt data at rest and in transit']));
        (0, globals_1.expect)(emailEntity?.regulatoryMappings.map((mapping) => mapping.framework)).toEqual(globals_1.expect.arrayContaining(['GDPR', 'CCPA']));
        const healthEntity = report.entities.find((entity) => entity.recordId === '2');
        (0, globals_1.expect)(healthEntity).toBeDefined();
        (0, globals_1.expect)(healthEntity?.categories).toContain('HEALTH');
        (0, globals_1.expect)(healthEntity?.sensitivity === 'HIGH' ||
            healthEntity?.sensitivity === 'CRITICAL').toBe(true);
        (0, globals_1.expect)(healthEntity?.regulatoryMappings.map((mapping) => mapping.framework)).toContain('HIPAA');
        const identifierEntity = report.entities.find((entity) => entity.recordId === '3');
        (0, globals_1.expect)(identifierEntity).toBeDefined();
        (0, globals_1.expect)(identifierEntity?.categories).toEqual(globals_1.expect.arrayContaining(['IDENTIFIER', 'FINANCIAL']));
        (0, globals_1.expect)(identifierEntity?.metadata.riskScore).toBeGreaterThanOrEqual(0.5);
        report.entities.forEach((entity) => {
            (0, globals_1.expect)(engine.getLineage(entity.id)).toEqual(entity.metadata.lineage);
        });
        const validations = report.validations;
        const hipaaValidation = validations.find((validation) => validation.framework === 'HIPAA');
        (0, globals_1.expect)(hipaaValidation).toBeDefined();
        (0, globals_1.expect)(hipaaValidation?.passed).toBe(true);
        const targetedValidations = engine.validateAgainstFrameworks(report.entities, ['GDPR', 'CCPA']);
        (0, globals_1.expect)(targetedValidations).toHaveLength(2);
        targetedValidations.forEach((validation) => {
            (0, globals_1.expect)(validation.framework === 'GDPR' || validation.framework === 'CCPA').toBe(true);
            (0, globals_1.expect)(validation.description.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.it)('produces regulatory summaries across frameworks', async () => {
        const records = [
            {
                id: 'summary-1',
                value: 'jane.doe@example.com',
                context: {
                    system: 'marketing',
                    field: 'email',
                    description: 'subscriber email record',
                },
            },
            {
                id: 'summary-2',
                value: 'Patient suffers from hypertension condition',
                context: {
                    system: 'ehr',
                    field: 'diagnosis',
                    description: 'clinical diagnosis field',
                },
            },
        ];
        const report = await engine.processRecords(records);
        (0, globals_1.expect)(Object.keys(report.regulatorySummary)).toEqual(globals_1.expect.arrayContaining(['GDPR', 'CCPA', 'HIPAA']));
        const gdprSummary = report.regulatorySummary.GDPR;
        (0, globals_1.expect)(gdprSummary.entities).toBeGreaterThanOrEqual(1);
        (0, globals_1.expect)(gdprSummary.categories.length).toBeGreaterThan(0);
        (0, globals_1.expect)(gdprSummary.obligations).toEqual(globals_1.expect.arrayContaining([
            'Document lawful basis for processing',
            'Apply data minimization and purpose limitation controls',
        ]));
    });
});
