"use strict";
/**
 * Tests for compliance and safeguards
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compliance_1 = require("../src/safeguards/compliance");
const types_1 = require("../src/types");
describe('checkAnalysisCompliance', () => {
    it('should pass for legitimate analysis request', () => {
        const result = (0, compliance_1.checkAnalysisCompliance)({
            countries: ['US', 'CN'],
            indicatorTypes: ['POLITICAL_STABILITY', 'ECONOMIC_STABILITY'],
        }, 'analyst@example.com', 'Risk assessment for business continuity planning in Asian markets');
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
    });
    it('should fail for prohibited pattern in purpose', () => {
        const result = (0, compliance_1.checkAnalysisCompliance)({
            countries: ['XX'],
        }, 'user@example.com', 'Planning a false flag operation');
        expect(result.passed).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.violations[0].category).toBe('ETHICS');
        expect(result.violations[0].severity).toBe('CRITICAL');
    });
    it('should flag sensitive indicators without justification', () => {
        const result = (0, compliance_1.checkAnalysisCompliance)({
            indicatorTypes: ['NUCLEAR_CAPABILITY', 'MILITARY_CAPABILITY'],
        }, 'analyst@example.com', 'Check this');
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.severity === 'MEDIUM')).toBe(true);
    });
    it('should flag bulk analysis without proper purpose', () => {
        const result = (0, compliance_1.checkAnalysisCompliance)({
            countries: Array.from({ length: 25 }, (_, i) => `C${i}`),
        }, 'analyst@example.com', 'General analysis');
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.description.includes('Large-scale'))).toBe(true);
    });
    it('should flag anonymous requests', () => {
        const result = (0, compliance_1.checkAnalysisCompliance)({ countries: ['US'] }, 'anonymous', 'Risk assessment');
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.description.includes('authenticated'))).toBe(true);
    });
});
describe('checkIndicatorCompliance', () => {
    const validIndicator = {
        id: 'test-123',
        type: 'POLITICAL_STABILITY',
        countryCode: 'NO',
        countryName: 'Norway',
        timestamp: new Date(),
        score: 85,
        riskLevel: types_1.RiskLevel.LOW,
        confidence: types_1.ConfidenceLevel.HIGH,
        metadata: {
            source: 'test-calculator',
        },
        eliteCohesion: 90,
        governmentEffectiveness: 90,
        politicalViolenceRisk: 10,
        institutionalStrength: 90,
        protestActivity: 10,
        electionRisk: 10,
    };
    it('should pass for valid indicator', () => {
        const result = (0, compliance_1.checkIndicatorCompliance)(validIndicator);
        expect(result.passed).toBe(true);
    });
    it('should flag PII in metadata', () => {
        const indicator = {
            ...validIndicator,
            metadata: {
                ...validIndicator.metadata,
                personalInfo: 'SSN: 123-45-6789',
            },
        };
        const result = (0, compliance_1.checkIndicatorCompliance)(indicator);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.category === 'PRIVACY')).toBe(true);
    });
    it('should flag missing source attribution', () => {
        const indicator = {
            ...validIndicator,
            metadata: {},
        };
        const result = (0, compliance_1.checkIndicatorCompliance)(indicator);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.description.includes('source'))).toBe(true);
    });
    it('should flag invalid score range', () => {
        const indicator = {
            ...validIndicator,
            score: 150,
        };
        const result = (0, compliance_1.checkIndicatorCompliance)(indicator);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.description.includes('score'))).toBe(true);
    });
});
describe('validatePurpose', () => {
    it('should validate legitimate humanitarian purpose', () => {
        const result = (0, compliance_1.validatePurpose)('Early warning system for humanitarian crisis preparedness');
        expect(result.valid).toBe(true);
        expect(result.category).toBe('humanitarian-early-warning');
        expect(result.concerns).toHaveLength(0);
    });
    it('should validate risk assessment purpose', () => {
        const result = (0, compliance_1.validatePurpose)('Supply chain risk assessment for critical materials');
        expect(result.valid).toBe(true);
        expect(result.category).toBe('risk-assessment');
    });
    it('should flag manipulation language', () => {
        const result = (0, compliance_1.validatePurpose)('Manipulate political situation to our advantage');
        expect(result.valid).toBe(false);
        expect(result.concerns.length).toBeGreaterThan(0);
        expect(result.concerns.some((c) => c.includes('Manipulation'))).toBe(true);
    });
    it('should flag destabilization language', () => {
        const result = (0, compliance_1.validatePurpose)('Destabilize the regime through economic pressure');
        expect(result.valid).toBe(false);
        expect(result.concerns.some((c) => c.includes('Destabilization'))).toBe(true);
    });
    it('should flag vague purposes', () => {
        const result = (0, compliance_1.validatePurpose)('General analysis');
        expect(result.valid).toBe(false);
        expect(result.category).toBeNull();
    });
});
