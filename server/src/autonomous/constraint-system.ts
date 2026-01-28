import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Logger } from 'pino';
import { fileURLToPath } from 'url';

export interface ConstraintViolation {
  constraint: string;
  expected: any;
  actual: any;
  message: string;
}

export interface ConstraintEvaluationResult {
  compliant: boolean;
  violations: ConstraintViolation[];
}

export class ConstraintSystem {
  private constraints: any;
  private logger: Logger | Console;

  constructor(logger: Logger | Console = console) {
    this.logger = logger;
    this.loadConstraints();
  }

  private loadConstraints() {
    try {
      // Handle ESM __dirname equivalents
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // Try multiple paths to find the constraints file
      const potentialPaths = [
        path.resolve(process.cwd(), 'governance/constraints.yaml'),
        path.resolve(process.cwd(), '../governance/constraints.yaml'),
        path.resolve(__dirname, '../../../../governance/constraints.yaml')
      ];

      let constraintPath = '';
      for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
          constraintPath = p;
          break;
        }
      }

      if (!constraintPath) {
        throw new Error('Constraints file not found in standard locations');
      }

      const fileContents = fs.readFileSync(constraintPath, 'utf8');
      this.constraints = yaml.load(fileContents);

      if (this.logger && typeof this.logger.info === 'function') {
        this.logger.info(`Loaded constraints from ${constraintPath}`);
      }
    } catch (error) {
      if (this.logger && typeof this.logger.error === 'function') {
        this.logger.error('Failed to load constraints', error);
      } else {
        console.error('Failed to load constraints', error);
      }
      // Initialize with empty structure to prevent crashes
      this.constraints = { release: {}, reliability: {}, capital: {}, governance: {} };
    }
  }

  public getConstraints(): any {
    return this.constraints;
  }

  public evaluateRelease(context: {
    errorBudgetBurn?: number;
    isBlackoutWindow?: boolean;
    dependencyAgeDays?: number;
  }): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const releaseConstraints = this.constraints.release || {};

    // Check Error Budget
    if (releaseConstraints.error_budget_ceiling && context.errorBudgetBurn !== undefined) {
      const limit = releaseConstraints.error_budget_ceiling.value;
      if (context.errorBudgetBurn > limit) {
        violations.push({
          constraint: 'error_budget_ceiling',
          expected: limit,
          actual: context.errorBudgetBurn,
          message: `Error budget burn ${context.errorBudgetBurn}% exceeds limit ${limit}%`
        });
      }
    }

    // Check Blackout Windows
    if (releaseConstraints.blackout_windows && context.isBlackoutWindow) {
      violations.push({
        constraint: 'blackout_windows',
        expected: false,
        actual: true,
        message: 'Release attempted during active blackout window'
      });
    }

    // Check Dependency Freshness
    if (releaseConstraints.dependency_freshness && context.dependencyAgeDays !== undefined) {
      const limit = releaseConstraints.dependency_freshness.value;
      if (context.dependencyAgeDays > limit) {
        violations.push({
          constraint: 'dependency_freshness',
          expected: limit,
          actual: context.dependencyAgeDays,
          message: `Dependency age ${context.dependencyAgeDays} days exceeds limit ${limit} days`
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  public evaluateReliability(context: {
    p95Latency?: number;
    blastRadius?: number;
  }): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const reliabilityConstraints = this.constraints.reliability || {};

    if (reliabilityConstraints.latency_p95 && context.p95Latency !== undefined) {
      const limit = reliabilityConstraints.latency_p95.value;
      if (context.p95Latency > limit) {
        violations.push({
          constraint: 'latency_p95',
          expected: limit,
          actual: context.p95Latency,
          message: `P95 Latency ${context.p95Latency}ms exceeds limit ${limit}ms`
        });
      }
    }

    if (reliabilityConstraints.blast_radius && context.blastRadius !== undefined) {
      const limit = reliabilityConstraints.blast_radius.value;
      if (context.blastRadius > limit) {
        violations.push({
          constraint: 'blast_radius',
          expected: limit,
          actual: context.blastRadius,
          message: `Blast radius ${context.blastRadius}% exceeds limit ${limit}%`
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  public evaluateCapital(context: {
    infraRoi?: number;
    experimentCost?: number;
  }): ConstraintEvaluationResult {
    const violations: ConstraintViolation[] = [];
    const capitalConstraints = this.constraints.capital || {};

    if (capitalConstraints.infra_roi_floor && context.infraRoi !== undefined) {
      const limit = capitalConstraints.infra_roi_floor.value;
      if (context.infraRoi < limit) {
        violations.push({
          constraint: 'infra_roi_floor',
          expected: limit,
          actual: context.infraRoi,
          message: `Infra ROI ${context.infraRoi} is below floor ${limit}`
        });
      }
    }

    if (capitalConstraints.experiment_cost_ceiling && context.experimentCost !== undefined) {
      const limit = capitalConstraints.experiment_cost_ceiling.value;
      if (context.experimentCost > limit) {
        violations.push({
          constraint: 'experiment_cost_ceiling',
          expected: limit,
          actual: context.experimentCost,
          message: `Experiment cost $${context.experimentCost} exceeds ceiling $${limit}`
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }
}
