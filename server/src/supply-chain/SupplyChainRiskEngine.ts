import { Vendor, SBOM, ContractAnalysis, SupplyChainRiskScore } from './types';

export class SupplyChainRiskEngine {

  calculateScore(
    vendor: Vendor,
    sboms: SBOM[], // Recent SBOMs
    contractAnalysis?: ContractAnalysis
  ): SupplyChainRiskScore {
    let score = 100;

    // 1. Vulnerability Impact
    let vulnPenalty = 0;
    for (const sbom of sboms) {
      for (const vuln of sbom.vulnerabilities) {
        if (vuln.severity === 'critical') vulnPenalty += 20;
        else if (vuln.severity === 'high') vulnPenalty += 10;
        else if (vuln.severity === 'medium') vulnPenalty += 5;
        else vulnPenalty += 1;
      }
    }
    // Cap vuln penalty
    if (vulnPenalty > 50) vulnPenalty = 50;

    // 2. Compliance Impact
    let compliancePenalty = 0;
    if (!vendor.complianceStatus.soc2) compliancePenalty += 15;
    if (!vendor.complianceStatus.iso27001) compliancePenalty += 10;
    if (!vendor.complianceStatus.gdpr) compliancePenalty += 10;
    if (compliancePenalty > 40) compliancePenalty = 40;

    // 3. Contract Risk
    let contractPenalty = 0;
    if (contractAnalysis) {
      if (!contractAnalysis.hasIndemnification) contractPenalty += 10;
      if (!contractAnalysis.hasIncidentReporting) contractPenalty += 10;
      if (!contractAnalysis.hasSecurityRequirements) contractPenalty += 5;
    } else {
      // No contract analyzed is a risk itself
      contractPenalty = 15;
    }

    score = score - vulnPenalty - compliancePenalty - contractPenalty;
    if (score < 0) score = 0;

    let riskLevel: SupplyChainRiskScore['riskLevel'] = 'low';
    if (score < 40) riskLevel = 'critical';
    else if (score < 60) riskLevel = 'high';
    else if (score < 80) riskLevel = 'medium';

    return {
      vendorId: vendor.id,
      overallScore: score,
      riskLevel,
      breakdown: {
        vulnerabilityRisk: vulnPenalty,
        complianceRisk: compliancePenalty,
        contractRisk: contractPenalty,
      },
      evaluatedAt: new Date().toISOString(),
    };
  }
}
