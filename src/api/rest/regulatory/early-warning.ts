export async function getEarlyWarning(req: any, res: any) {
  res.json({
    institutionId: req.params.institutionId,
    enforcementRiskScore: 0,
    leadTimeDaysPredicted: null,
    likelyRegulator: "CFPB",
    likelyIssue: "UNKNOWN",
    topDrivers: [],
    evidenceIds: []
  })
}
