"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GovernanceRiskService_1 = require("../../../src/services/governance/GovernanceRiskService");
const MissionGuardrailService_1 = require("../../../src/services/governance/MissionGuardrailService");
const PhilanthropyService_1 = require("../../../src/services/governance/PhilanthropyService");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Governance & Ethics Layer', () => {
    (0, globals_1.describe)('GovernanceRiskService', () => {
        const service = GovernanceRiskService_1.GovernanceRiskService.getInstance();
        (0, globals_1.it)('should assign HIGH risk and DENY mitigation for authoritarian partnerships', () => {
            const result = service.calculateRisk({
                partnerships: ['authoritarian_regime_support']
            });
            (0, globals_1.expect)(result.score).toBeGreaterThanOrEqual(100);
            (0, globals_1.expect)(result.requiredMitigation).toBe('DENY');
        });
        (0, globals_1.it)('should assign MEDIUM risk and REVIEW for high-risk use cases', () => {
            const result = service.calculateRisk({
                useCase: 'surveillance'
            });
            (0, globals_1.expect)(result.score).toBeGreaterThanOrEqual(70);
        });
    });
    (0, globals_1.describe)('MissionGuardrailService', () => {
        const service = MissionGuardrailService_1.MissionGuardrailService.getInstance();
        (0, globals_1.it)('should block disallowed sectors', () => {
            const result = service.checkGuardrails({
                sector: 'gambling'
            });
            (0, globals_1.expect)(result.allowed).toBe(false);
            (0, globals_1.expect)(result.violations[0]).toContain('disallowed');
        });
        (0, globals_1.it)('should pass allowed sectors with safe parameters', () => {
            const result = service.checkGuardrails({
                sector: 'healthcare',
                useCase: 'data_analysis'
            });
            (0, globals_1.expect)(result.allowed).toBe(true);
        });
    });
    (0, globals_1.describe)('PhilanthropyService', () => {
        const service = PhilanthropyService_1.PhilanthropyService.getInstance();
        (0, globals_1.it)('should calculate correct sliding scale contribution', () => {
            const smallEvent = service.calculateObligation({
                id: '1', type: 'PROFIT_DISTRIBUTION', amount: 100000, entityId: 'e1', timestamp: new Date()
            });
            (0, globals_1.expect)(smallEvent.contribution).toBe(1000); // 1%
            const largeEvent = service.calculateObligation({
                id: '2', type: 'PROFIT_DISTRIBUTION', amount: 20000000, entityId: 'e1', timestamp: new Date()
            });
            (0, globals_1.expect)(largeEvent.contribution).toBe(1000000); // 5%
        });
    });
});
