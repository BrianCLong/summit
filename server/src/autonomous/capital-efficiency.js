"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapitalAllocationEngine = void 0;
class CapitalAllocationEngine {
    constraints;
    logger;
    constructor(constraints, logger = console) {
        this.constraints = constraints;
        this.logger = logger;
    }
    evaluateInvestment(opportunity) {
        // 1. Calculate Total Value
        // Value = Revenue + Reliability Value + Velocity Value
        const totalValue = (opportunity.projectedRevenue || 0)
            + (opportunity.reliabilityValue || 0)
            + (opportunity.velocityValue || 0);
        // 2. Calculate ROI
        // ROI = Total Value / Cost (Simple ROI ratio used in constraints.yaml usually refers to return multiple)
        // If constraints says 3.0, it usually means $3 return for $1 spend.
        const roi = opportunity.costUsd > 0 ? totalValue / opportunity.costUsd : 0;
        // 3. Check against Constraints
        const constraintCheck = this.constraints.evaluateCapital({ infraRoi: roi });
        let recommendation = 'HOLD';
        let rationale = '';
        if (constraintCheck.compliant) {
            recommendation = 'INVEST';
            rationale = `ROI ${roi.toFixed(2)} meets capital efficiency constraints`;
        }
        else {
            recommendation = 'DIVEST';
            const violations = constraintCheck.violations.map(v => v.message).join('; ');
            rationale = `Capital constraints violated: ${violations}`;
        }
        return {
            opportunity: opportunity.name,
            roi,
            recommendation,
            rationale
        };
    }
}
exports.CapitalAllocationEngine = CapitalAllocationEngine;
