import { ConstraintSystem } from './constraint-system.js';
import { Logger } from 'pino';

export interface InfraProposal {
  resourceType: string;
  action: 'scale_up' | 'scale_down' | 'provision' | 'decommission';
  costImpactUsd: number;
  reliabilityImpact: number; // 0-1 score
}

export interface SimulationResult {
  approved: boolean;
  worstCaseScenario: string;
  survivalProbability: number;
  decision: string;
}

export class InfraResilienceSimulator {
  private constraints: ConstraintSystem;
  private logger: Logger | Console;

  constructor(constraints: ConstraintSystem, logger: Logger | Console = console) {
    this.constraints = constraints;
    this.logger = logger;
  }

  public evaluateProposal(proposal: InfraProposal): SimulationResult {
    // 1. Define Pessimal Scenarios
    const scenarios = [
      { name: 'Region Failure', stressFactor: 0.5 },
      { name: 'Cascading Dependency Failure', stressFactor: 0.3 },
      { name: 'Cost Spike (3x)', stressFactor: 1.0 }
    ];

    this.logger.info(`Evaluating proposal for ${proposal.resourceType} against worst-case scenarios...`);

    // 2. Simulate against scenarios
    // Logic: If scaling up, does it survive a cost spike? If scaling down, does it survive a region failure?

    let worstCase = '';
    let minSurvivalProb = 1.0;

    for (const scenario of scenarios) {
      let survivalProb = 1.0;

      if (scenario.name === 'Cost Spike (3x)') {
        // If cost spikes 3x, do we break budget?
        const simulatedCost = proposal.costImpactUsd * 3;
        // Check against hypothetical budget (e.g. $500)
        if (simulatedCost > 500) {
            survivalProb = 0.0;
        }
      } else if (scenario.name === 'Region Failure') {
        // If region fails, we need redundancy.
        if (proposal.action === 'scale_down') {
            survivalProb = 0.2; // Scaling down reduces redundancy
        }
      }

      if (survivalProb < minSurvivalProb) {
        minSurvivalProb = survivalProb;
        worstCase = scenario.name;
      }
    }

    // 3. Decision
    // We approve only if survival probability in worst case is > threshold (e.g. 0.8)
    const approved = minSurvivalProb > 0.8;

    return {
      approved,
      worstCaseScenario: worstCase,
      survivalProbability: minSurvivalProb,
      decision: approved ? 'APPROVED' : `REJECTED (Vulnerable to ${worstCase})`
    };
  }
}
