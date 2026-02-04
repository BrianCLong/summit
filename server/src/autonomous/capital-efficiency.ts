import { ConstraintSystem } from './constraint-system.js';
import { Logger } from 'pino';

export interface InvestmentOpportunity {
  name: string;
  costUsd: number;
  projectedRevenue?: number;
  reliabilityValue?: number; // Estimated value of uptime
  velocityValue?: number; // Estimated value of faster release
}

export interface AllocationRecommendation {
  opportunity: string;
  roi: number;
  recommendation: 'INVEST' | 'HOLD' | 'DIVEST';
  rationale: string;
}

export class CapitalAllocationEngine {
  private constraints: ConstraintSystem;
  private logger: Logger | Console;

  constructor(constraints: ConstraintSystem, logger: Logger | Console = console) {
    this.constraints = constraints;
    this.logger = logger;
  }

  public evaluateInvestment(opportunity: InvestmentOpportunity): AllocationRecommendation {
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

    let recommendation: 'INVEST' | 'HOLD' | 'DIVEST' = 'HOLD';
    let rationale = '';

    if (constraintCheck.compliant) {
        recommendation = 'INVEST';
        rationale = `ROI ${roi.toFixed(2)} meets capital efficiency constraints`;
    } else {
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
