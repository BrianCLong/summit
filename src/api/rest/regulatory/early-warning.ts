export async function getEarlyWarning(req: any, res: any) {
<<<<<<< HEAD
  if (process.env.REGULATORY_EW_EXTERNAL_API_ENABLED === 'false') {
    return res.status(403).json({ error: "Regulatory Early Warning API disabled" });
  }

  // Need to enforce operator review
  if (process.env.REGULATORY_EW_OPERATOR_REVIEW_REQUIRED === 'true') {
     // TODO Check if operator has reviewed
  }

  res.json({
    institutionId: req.params?.institutionId || "unknown",
=======
  res.json({
    institutionId: req.params.institutionId,
>>>>>>> origin/main
    enforcementRiskScore: 0,
    leadTimeDaysPredicted: null,
    likelyRegulator: "CFPB",
    likelyIssue: "UNKNOWN",
    topDrivers: [],
    evidenceIds: []
  })
}
