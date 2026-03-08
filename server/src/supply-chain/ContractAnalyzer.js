"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractAnalyzer = void 0;
const crypto_1 = require("crypto");
class ContractAnalyzer {
    /**
     * Analyzes raw contract text for security and compliance terms.
     */
    async analyze(contractText, vendorId) {
        const text = contractText.toLowerCase();
        // Heuristic checks
        const hasIndemnification = text.includes('indemnification') || text.includes('hold harmless');
        const hasSLA = text.includes('service level agreement') || text.includes('uptime guarantee');
        const hasSecurityRequirements = text.includes('security requirements') || text.includes('information security policy');
        const hasIncidentReporting = text.includes('incident reporting') || text.includes('breach notification');
        const riskFactors = [];
        if (!hasIndemnification)
            riskFactors.push('Missing Indemnification Clause');
        if (!hasIncidentReporting)
            riskFactors.push('Missing Incident Reporting Clause');
        if (!hasSecurityRequirements)
            riskFactors.push('Missing Security Requirements');
        return {
            id: (0, crypto_1.randomUUID)(),
            vendorId,
            hasIndemnification,
            hasSLA,
            hasSecurityRequirements,
            hasIncidentReporting,
            riskFactors,
            analyzedAt: new Date().toISOString(),
        };
    }
}
exports.ContractAnalyzer = ContractAnalyzer;
