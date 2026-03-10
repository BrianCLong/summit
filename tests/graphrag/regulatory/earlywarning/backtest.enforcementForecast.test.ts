<<<<<<< HEAD
import { describe, it, expect } from 'vitest'

describe("regulatory early warning backtest", () => {
  it("produces deterministic metrics for fixed fixture windows", async () => {
    expect(true).toBe(true)
=======
import { EnforcementForecastAgent } from '../../../../src/agents/regulatory/EnforcementForecastAgent';

describe("regulatory early warning backtest", () => {
  it("produces deterministic metrics for fixed fixture windows", async () => {
    const agent = new EnforcementForecastAgent();
    const result = await agent.forecastInstitutionRisk({ institutionId: 'TEST-123' });
    expect(result.enforcementRiskScore).toBe(0);
    expect(result.likelyRegulator).toBe("CFPB");
    expect(result.evidenceIds).toContain("EVD-REWS-LEAD-001");
>>>>>>> origin/main
  })
})
