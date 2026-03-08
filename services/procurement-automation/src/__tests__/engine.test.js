"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const engine_js_1 = require("../engine.js");
(0, globals_1.describe)('ProcurementAutomationEngine', () => {
    let engine;
    let mockOrganization;
    let mockSystem;
    (0, globals_1.beforeEach)(() => {
        mockOrganization = {
            name: 'Test Corp',
            address: '123 Test St',
            city: 'Washington',
            state: 'DC',
            zip: '20001',
            country: 'USA',
            phone: '555-0100',
            website: 'https://test.example.com',
            dunsNumber: '123456789',
            cageCode: 'ABC12',
            naicsCodes: ['541511', '541512'],
            authorizedRepresentative: {
                name: 'Jane Doe',
                title: 'CEO',
                email: 'jane@test.example.com',
                phone: '555-0101',
            },
            technicalContact: {
                name: 'John Smith',
                title: 'CTO',
                email: 'john@test.example.com',
                phone: '555-0102',
            },
            securityContact: {
                name: 'Alice Johnson',
                title: 'CISO',
                email: 'alice@test.example.com',
                phone: '555-0103',
            },
        };
        mockSystem = {
            systemName: 'Test System',
            systemAcronym: 'TS',
            systemDescription: 'A test system for unit testing',
            systemType: 'major_application',
            deploymentModel: 'public_cloud',
            cloudProvider: 'AWS',
            cloudRegions: ['us-east-1', 'us-west-2'],
            operationalStatus: 'operational',
            systemBoundary: {
                components: ['Web Server', 'Database', 'API Gateway'],
                dataFlows: ['User -> Web -> API -> DB'],
                externalInterfaces: ['SSO Provider', 'Email Service'],
            },
            dataTypes: ['PII', 'CUI'],
            userTypes: ['Admin', 'User', 'Guest'],
            estimatedUsers: 1000,
            fipsCategory: {
                confidentiality: 'moderate',
                integrity: 'moderate',
                availability: 'low',
            },
        };
        engine = new engine_js_1.ProcurementAutomationEngine({
            organization: mockOrganization,
            system: mockSystem,
        });
    });
    (0, globals_1.describe)('quickStart', () => {
        (0, globals_1.it)('should return complete quick start result', () => {
            const result = engine.quickStart({
                title: 'Test FedRAMP Authorization',
                description: 'Testing the quick start feature',
                frameworks: ['FedRAMP_Moderate'],
                dataClassification: 'cui',
            });
            (0, globals_1.expect)(result).toHaveProperty('requestId');
            (0, globals_1.expect)(result).toHaveProperty('requirements');
            (0, globals_1.expect)(result).toHaveProperty('checklist');
            (0, globals_1.expect)(result).toHaveProperty('timeline');
            (0, globals_1.expect)(result).toHaveProperty('forms');
        });
        (0, globals_1.it)('should parse requirements correctly', () => {
            const result = engine.quickStart({
                title: 'Test',
                description: 'Test',
                frameworks: ['FedRAMP_High'],
            });
            (0, globals_1.expect)(result.requirements.frameworks).toContain('FedRAMP_High');
            (0, globals_1.expect)(result.requirements.riskLevel).toBe('high');
        });
        (0, globals_1.it)('should generate checklist for framework', () => {
            const result = engine.quickStart({
                title: 'Test',
                description: 'Test',
                frameworks: ['FedRAMP_Moderate'],
            });
            (0, globals_1.expect)(result.checklist.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.checklist[0]).toHaveProperty('category');
            (0, globals_1.expect)(result.checklist[0]).toHaveProperty('items');
        });
        (0, globals_1.it)('should generate timeline with milestones', () => {
            const result = engine.quickStart({
                title: 'Test',
                description: 'Test',
                frameworks: ['FedRAMP_Moderate'],
            });
            (0, globals_1.expect)(result.timeline.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.timeline[0]).toHaveProperty('task');
            (0, globals_1.expect)(result.timeline[0]).toHaveProperty('startDate');
            (0, globals_1.expect)(result.timeline[0]).toHaveProperty('endDate');
        });
    });
    (0, globals_1.describe)('parseRequirements', () => {
        (0, globals_1.it)('should parse text requirements', () => {
            const result = engine.parseRequirements('Need FedRAMP Moderate for CUI data');
            (0, globals_1.expect)(result.frameworks).toContain('FedRAMP_Moderate');
            (0, globals_1.expect)(result.dataClassification).toBe('cui');
        });
    });
    (0, globals_1.describe)('generateChecklist', () => {
        (0, globals_1.it)('should generate framework-specific checklist', () => {
            const checklist = engine.generateChecklist('CMMC_L2');
            (0, globals_1.expect)(checklist.length).toBeGreaterThan(0);
            const docCategory = checklist.find((c) => c.category === 'Documentation');
            (0, globals_1.expect)(docCategory).toBeDefined();
        });
    });
    (0, globals_1.describe)('listFormTemplates', () => {
        (0, globals_1.it)('should return available form templates', () => {
            const templates = engine.listFormTemplates();
            (0, globals_1.expect)(templates.length).toBeGreaterThan(0);
            (0, globals_1.expect)(templates[0]).toHaveProperty('id');
            (0, globals_1.expect)(templates[0]).toHaveProperty('name');
            (0, globals_1.expect)(templates[0]).toHaveProperty('framework');
        });
    });
    (0, globals_1.describe)('autoCompleteForm', () => {
        (0, globals_1.it)('should auto-complete SSP form', () => {
            const result = engine.autoCompleteForm('ssp_fedramp');
            (0, globals_1.expect)(result).toHaveProperty('formId');
            (0, globals_1.expect)(result).toHaveProperty('completionPercentage');
            (0, globals_1.expect)(result).toHaveProperty('fields');
            (0, globals_1.expect)(result.completionPercentage).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should identify fields that need manual review', () => {
            const result = engine.autoCompleteForm('ssp_fedramp');
            (0, globals_1.expect)(result).toHaveProperty('requiresManualReview');
            (0, globals_1.expect)(Array.isArray(result.requiresManualReview)).toBe(true);
        });
    });
    (0, globals_1.describe)('generateDocument', () => {
        (0, globals_1.it)('should generate SSP document', async () => {
            const doc = await engine.generateDocument('SSP');
            (0, globals_1.expect)(doc).toHaveProperty('id');
            (0, globals_1.expect)(doc).toHaveProperty('type');
            (0, globals_1.expect)(doc).toHaveProperty('content');
            (0, globals_1.expect)(doc.type).toBe('SSP');
            (0, globals_1.expect)(doc.content).toContain('System Security Plan');
            (0, globals_1.expect)(doc.content).toContain(mockSystem.systemName);
        });
        (0, globals_1.it)('should generate POA&M document', async () => {
            const doc = await engine.generateDocument('POA_M');
            (0, globals_1.expect)(doc.type).toBe('POA_M');
            (0, globals_1.expect)(doc.content).toContain('Plan of Action and Milestones');
        });
    });
    (0, globals_1.describe)('generateATOPackage', () => {
        (0, globals_1.it)('should generate complete ATO package', async () => {
            const pkg = await engine.generateATOPackage('FedRAMP_Moderate');
            (0, globals_1.expect)(pkg).toHaveProperty('id');
            (0, globals_1.expect)(pkg).toHaveProperty('framework');
            (0, globals_1.expect)(pkg).toHaveProperty('documents');
            (0, globals_1.expect)(pkg).toHaveProperty('controls');
            (0, globals_1.expect)(pkg).toHaveProperty('completionPercentage');
            (0, globals_1.expect)(pkg.framework).toBe('FedRAMP_Moderate');
            (0, globals_1.expect)(pkg.documents.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('getControls', () => {
        (0, globals_1.it)('should return controls after quickStart', () => {
            engine.quickStart({
                title: 'Test',
                description: 'Test',
                frameworks: ['FedRAMP_Moderate'],
            });
            const controls = engine.getControls();
            (0, globals_1.expect)(controls.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('updateControl', () => {
        (0, globals_1.it)('should update control status', () => {
            engine.quickStart({
                title: 'Test',
                description: 'Test',
                frameworks: ['FedRAMP_Moderate'],
            });
            const controls = engine.getControls();
            const firstControl = controls[0];
            engine.updateControl(firstControl.id, {
                status: 'implemented',
                implementationNarrative: 'Control has been implemented.',
            });
            const updatedControls = engine.getControls();
            const updated = updatedControls.find((c) => c.id === firstControl.id);
            (0, globals_1.expect)(updated?.status).toBe('implemented');
            (0, globals_1.expect)(updated?.implementationNarrative).toBe('Control has been implemented.');
        });
    });
});
