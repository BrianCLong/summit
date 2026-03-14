export class EnforcementForecastAgent {
  async forecastInstitutionRisk(input: { institutionId: string }) {
<<<<<<< HEAD
    if (process.env.REGULATORY_EW_ENABLED === 'false') {
       return null;
    }
=======
>>>>>>> origin/main
    return {
      institutionId: input.institutionId,
      enforcementRiskScore: 0,
      leadTimeDaysPredicted: null,
      likelyRegulator: "CFPB",
      likelyIssue: "UNKNOWN",
      topDrivers: [],
      evidenceIds: ["EVD-REWS-LEAD-001"]
    }
  }
}
