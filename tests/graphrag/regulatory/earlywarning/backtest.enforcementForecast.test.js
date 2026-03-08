"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnforcementForecastAgent_1 = require("../../../../src/agents/regulatory/EnforcementForecastAgent");
describe("regulatory early warning backtest", () => {
    it("produces deterministic metrics for fixed fixture windows", async () => {
        const agent = new EnforcementForecastAgent_1.EnforcementForecastAgent();
        const result = await agent.forecastInstitutionRisk({ institutionId: 'TEST-123' });
        expect(result.enforcementRiskScore).toBe(0);
        expect(result.likelyRegulator).toBe("CFPB");
        expect(result.evidenceIds).toContain("EVD-REWS-LEAD-001");
    });
});
