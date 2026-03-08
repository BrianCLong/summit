"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEarlyWarning = getEarlyWarning;
async function getEarlyWarning(req, res) {
    res.json({
        institutionId: req.params.institutionId,
        enforcementRiskScore: 0,
        leadTimeDaysPredicted: null,
        likelyRegulator: "CFPB",
        likelyIssue: "UNKNOWN",
        topDrivers: [],
        evidenceIds: []
    });
}
