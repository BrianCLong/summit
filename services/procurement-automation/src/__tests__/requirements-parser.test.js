"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const requirements_parser_js_1 = require("../requirements-parser.js");
(0, globals_1.describe)('RequirementsParser', () => {
    let parser;
    (0, globals_1.beforeEach)(() => {
        parser = new requirements_parser_js_1.RequirementsParser();
    });
    (0, globals_1.describe)('parseRequirementsText', () => {
        (0, globals_1.it)('should detect FedRAMP Moderate from text', () => {
            const result = parser.parseRequirementsText('We need FedRAMP Moderate authorization for our cloud service');
            (0, globals_1.expect)(result.frameworks).toContain('FedRAMP_Moderate');
            (0, globals_1.expect)(result.riskLevel).toBe('moderate');
        });
        (0, globals_1.it)('should detect FedRAMP High from text', () => {
            const result = parser.parseRequirementsText('Seeking FedRAMP High authorization');
            (0, globals_1.expect)(result.frameworks).toContain('FedRAMP_High');
            (0, globals_1.expect)(result.riskLevel).toBe('high');
        });
        (0, globals_1.it)('should detect CMMC Level 2 from text', () => {
            const result = parser.parseRequirementsText('Must achieve CMMC Level 2 certification');
            (0, globals_1.expect)(result.frameworks).toContain('CMMC_L2');
        });
        (0, globals_1.it)('should detect IL5 from text', () => {
            const result = parser.parseRequirementsText('DoD IL-5 authorization required');
            (0, globals_1.expect)(result.frameworks).toContain('IL5');
            (0, globals_1.expect)(result.riskLevel).toBe('high');
        });
        (0, globals_1.it)('should detect multiple frameworks', () => {
            const result = parser.parseRequirementsText('Need both FedRAMP Moderate and SOC 2 compliance');
            (0, globals_1.expect)(result.frameworks).toContain('FedRAMP_Moderate');
            (0, globals_1.expect)(result.frameworks).toContain('SOC2');
        });
        (0, globals_1.it)('should detect data classification from text', () => {
            const result = parser.parseRequirementsText('System handles CUI data requiring FedRAMP');
            (0, globals_1.expect)(result.dataClassification).toBe('cui');
        });
        (0, globals_1.it)('should default to FedRAMP_Moderate when no framework detected', () => {
            const result = parser.parseRequirementsText('We need cloud authorization');
            (0, globals_1.expect)(result.frameworks).toContain('FedRAMP_Moderate');
        });
    });
    (0, globals_1.describe)('parseStructuredRequirements', () => {
        (0, globals_1.it)('should return correct requirements for FedRAMP_High', () => {
            const result = parser.parseStructuredRequirements({
                frameworks: ['FedRAMP_High'],
                dataClassification: 'cui',
            });
            (0, globals_1.expect)(result.frameworks).toEqual(['FedRAMP_High']);
            (0, globals_1.expect)(result.riskLevel).toBe('high');
            (0, globals_1.expect)(result.requiredDocuments).toContain('SSP');
            (0, globals_1.expect)(result.requiredDocuments).toContain('SAR');
            (0, globals_1.expect)(result.requiredDocuments).toContain('SBOM');
            (0, globals_1.expect)(result.requiredDocuments).toContain('PENETRATION_TEST');
            (0, globals_1.expect)(result.estimatedControls).toBeGreaterThan(400);
        });
        (0, globals_1.it)('should aggregate control families from multiple frameworks', () => {
            const result = parser.parseStructuredRequirements({
                frameworks: ['FedRAMP_Moderate', 'HIPAA'],
            });
            (0, globals_1.expect)(result.controlFamilies).toContain('AC');
            (0, globals_1.expect)(result.controlFamilies).toContain('AU');
            (0, globals_1.expect)(result.controlFamilies).toContain('SC');
        });
        (0, globals_1.it)('should calculate correct risk level for secret classification', () => {
            const result = parser.parseStructuredRequirements({
                frameworks: ['FedRAMP_Moderate'],
                dataClassification: 'secret',
            });
            (0, globals_1.expect)(result.riskLevel).toBe('high');
        });
        (0, globals_1.it)('should provide gap analysis', () => {
            const result = parser.parseStructuredRequirements({
                frameworks: ['FedRAMP_Moderate'],
            });
            (0, globals_1.expect)(result.gapAnalysis.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.gapAnalysis[0]).toHaveProperty('family');
            (0, globals_1.expect)(result.gapAnalysis[0]).toHaveProperty('familyName');
            (0, globals_1.expect)(result.gapAnalysis[0]).toHaveProperty('priority');
        });
    });
    (0, globals_1.describe)('generateInitialControls', () => {
        (0, globals_1.it)('should generate controls from parsed requirements', () => {
            const requirements = parser.parseStructuredRequirements({
                frameworks: ['FedRAMP_Moderate'],
            });
            const controls = parser.generateInitialControls(requirements);
            (0, globals_1.expect)(controls.length).toBeGreaterThan(0);
            (0, globals_1.expect)(controls[0]).toHaveProperty('id');
            (0, globals_1.expect)(controls[0]).toHaveProperty('family');
            (0, globals_1.expect)(controls[0]).toHaveProperty('title');
            (0, globals_1.expect)(controls[0]).toHaveProperty('status');
            (0, globals_1.expect)(controls[0].status).toBe('not_started');
        });
        (0, globals_1.it)('should assign correct priorities to controls', () => {
            const requirements = parser.parseStructuredRequirements({
                frameworks: ['FedRAMP_High'],
            });
            const controls = parser.generateInitialControls(requirements);
            const acControls = controls.filter((c) => c.family === 'AC');
            (0, globals_1.expect)(acControls.length).toBeGreaterThan(0);
            (0, globals_1.expect)(acControls[0].priority).toBe('P0'); // AC is critical
        });
    });
});
