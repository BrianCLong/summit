"use strict";
/**
 * WMD Threat Assessment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WMDThreatAssessor = void 0;
class WMDThreatAssessor {
    assessOverallThreat(country, data) {
        let score = 0;
        const factors = [];
        const recommendations = [];
        if (data.stockpile) {
            const weapons = data.stockpile.total_weapons || 0;
            if (weapons > 1000) {
                score += 40;
                factors.push('Large stockpile');
            }
            else if (weapons > 100) {
                score += 25;
                factors.push('Moderate stockpile');
            }
            else if (weapons > 0) {
                score += 15;
                factors.push('Small stockpile');
            }
            if (data.stockpile.modernization_status === 'active') {
                score += 15;
                factors.push('Active modernization');
            }
        }
        if (data.program && data.program.status === 'active') {
            score += 20;
            factors.push('Active WMD program');
        }
        if (data.command_control) {
            if (data.command_control.crisis_stability === 'low') {
                score += 15;
                factors.push('Low crisis stability');
                recommendations.push('Enhance crisis communication');
            }
        }
        let threat_level;
        if (score >= 70) {
            threat_level = 'critical';
            recommendations.push('Immediate diplomatic engagement', 'Enhanced monitoring');
        }
        else if (score >= 50) {
            threat_level = 'high';
            recommendations.push('Regular monitoring', 'Preventive diplomacy');
        }
        else if (score >= 30) {
            threat_level = 'moderate';
            recommendations.push('Standard monitoring');
        }
        else if (score >= 15) {
            threat_level = 'low';
        }
        else {
            threat_level = 'minimal';
        }
        return { threat_level, threat_score: score, factors, recommendations };
    }
    assessProliferationRisk(country, indicators) {
        const risk_factors = [];
        let riskScore = 0;
        if (indicators.undeclared_facilities > 0) {
            riskScore += 30;
            risk_factors.push(`${indicators.undeclared_facilities} undeclared facilities`);
        }
        if (indicators.international_sanctions) {
            riskScore += 25;
            risk_factors.push('Under international sanctions');
        }
        if (indicators.treaty_violations > 0) {
            riskScore += 20 * Math.min(indicators.treaty_violations, 3);
            risk_factors.push(`${indicators.treaty_violations} treaty violations`);
        }
        if (indicators.export_control_violations > 0) {
            riskScore += 15;
            risk_factors.push('Export control violations');
        }
        return {
            risk_level: riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low',
            risk_factors
        };
    }
}
exports.WMDThreatAssessor = WMDThreatAssessor;
