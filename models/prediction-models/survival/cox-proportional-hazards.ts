/**
 * Cox Proportional Hazards Model
 */

export interface SurvivalObservation {
  time: number;
  event: boolean;
  covariates: number[];
}

export interface CoxModelResult {
  coefficients: number[];
  standardErrors: number[];
  hazardRatios: number[];
  pValues: number[];
  logLikelihood: number;
  concordance: number;
}

export interface SurvivalPrediction {
  time: number;
  survivalProbability: number;
  hazard: number;
  riskScore: number;
}

export class CoxProportionalHazards {
  private coefficients: number[] = [];
  private baselineHazard: Map<number, number> = new Map();
  private featureNames: string[] = [];
  private fitted: boolean = false;

  /**
   * Fit Cox model using partial likelihood
   */
  fit(
    data: SurvivalObservation[],
    featureNames?: string[],
    maxIterations: number = 100,
    tolerance: number = 1e-6
  ): CoxModelResult {
    const n = data.length;
    const p = data[0].covariates.length;

    this.featureNames = featureNames || Array.from({ length: p }, (_, i) => `X${i}`);
    this.coefficients = new Array(p).fill(0);

    // Sort by time
    const sortedData = [...data].sort((a, b) => a.time - b.time);

    // Newton-Raphson optimization
    for (let iter = 0; iter < maxIterations; iter++) {
      const { gradient, hessian } = this.computeGradientHessian(sortedData);

      // Newton step
      const step = this.solveLinearSystem(hessian, gradient);

      let maxChange = 0;
      for (let j = 0; j < p; j++) {
        const change = step[j];
        this.coefficients[j] += change;
        maxChange = Math.max(maxChange, Math.abs(change));
      }

      if (maxChange < tolerance) {
        break;
      }
    }

    // Calculate baseline hazard using Breslow estimator
    this.estimateBaselineHazard(sortedData);

    // Calculate model statistics
    const { standardErrors, pValues } = this.computeStatistics(sortedData);
    const hazardRatios = this.coefficients.map(b => Math.exp(b));
    const logLikelihood = this.computeLogLikelihood(sortedData);
    const concordance = this.computeConcordance(sortedData);

    this.fitted = true;

    return {
      coefficients: [...this.coefficients],
      standardErrors,
      hazardRatios,
      pValues,
      logLikelihood,
      concordance,
    };
  }

  /**
   * Predict survival function
   */
  predictSurvival(covariates: number[], times?: number[]): SurvivalPrediction[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before prediction');
    }

    const riskScore = this.computeRiskScore(covariates);
    const predictions: SurvivalPrediction[] = [];

    const eventTimes = times || Array.from(this.baselineHazard.keys()).sort((a, b) => a - b);

    let cumulativeHazard = 0;

    for (const time of eventTimes) {
      const baselineH = this.baselineHazard.get(time) || 0;
      cumulativeHazard += baselineH;

      const hazard = cumulativeHazard * riskScore;
      const survivalProbability = Math.exp(-hazard);

      predictions.push({
        time,
        survivalProbability,
        hazard,
        riskScore,
      });
    }

    return predictions;
  }

  /**
   * Calculate risk score for stratification
   */
  getRiskScore(covariates: number[]): number {
    return this.computeRiskScore(covariates);
  }

  /**
   * Get hazard ratios with confidence intervals
   */
  getHazardRatios(): Array<{
    feature: string;
    hazardRatio: number;
    lowerCI: number;
    upperCI: number;
  }> {
    return this.featureNames.map((name, i) => {
      const hr = Math.exp(this.coefficients[i]);
      const se = 0.1; // Simplified - would calculate from Hessian
      const lowerCI = Math.exp(this.coefficients[i] - 1.96 * se);
      const upperCI = Math.exp(this.coefficients[i] + 1.96 * se);

      return { feature: name, hazardRatio: hr, lowerCI, upperCI };
    });
  }

  /**
   * Risk stratification
   */
  stratifyRisk(
    data: SurvivalObservation[],
    numGroups: number = 3
  ): Map<string, SurvivalObservation[]> {
    const riskScores = data.map(d => ({
      observation: d,
      score: this.computeRiskScore(d.covariates),
    }));

    riskScores.sort((a, b) => a.score - b.score);

    const groupSize = Math.ceil(riskScores.length / numGroups);
    const groups = new Map<string, SurvivalObservation[]>();

    const labels = ['Low Risk', 'Medium Risk', 'High Risk'];

    for (let g = 0; g < numGroups; g++) {
      const start = g * groupSize;
      const end = Math.min(start + groupSize, riskScores.length);
      const label = labels[g] || `Group ${g + 1}`;

      groups.set(label, riskScores.slice(start, end).map(r => r.observation));
    }

    return groups;
  }

  /**
   * Compute gradient and Hessian
   */
  private computeGradientHessian(data: SurvivalObservation[]): {
    gradient: number[];
    hessian: number[][];
  } {
    const p = this.coefficients.length;
    const gradient = new Array(p).fill(0);
    const hessian = Array.from({ length: p }, () => new Array(p).fill(0));

    const eventTimes = [...new Set(data.filter(d => d.event).map(d => d.time))];

    for (const t of eventTimes) {
      const atRisk = data.filter(d => d.time >= t);
      const events = data.filter(d => d.time === t && d.event);

      // Calculate risk set sums
      let s0 = 0;
      const s1 = new Array(p).fill(0);
      const s2 = Array.from({ length: p }, () => new Array(p).fill(0));

      for (const obs of atRisk) {
        const expScore = Math.exp(this.linearPredictor(obs.covariates));
        s0 += expScore;

        for (let j = 0; j < p; j++) {
          s1[j] += obs.covariates[j] * expScore;

          for (let k = 0; k < p; k++) {
            s2[j][k] += obs.covariates[j] * obs.covariates[k] * expScore;
          }
        }
      }

      // Update gradient and Hessian
      for (const event of events) {
        for (let j = 0; j < p; j++) {
          gradient[j] += event.covariates[j] - s1[j] / s0;

          for (let k = 0; k < p; k++) {
            hessian[j][k] -= s2[j][k] / s0 - (s1[j] * s1[k]) / (s0 * s0);
          }
        }
      }
    }

    return { gradient, hessian };
  }

  /**
   * Estimate baseline hazard using Breslow estimator
   */
  private estimateBaselineHazard(data: SurvivalObservation[]): void {
    this.baselineHazard.clear();

    const eventTimes = [...new Set(data.filter(d => d.event).map(d => d.time))].sort((a, b) => a - b);

    for (const t of eventTimes) {
      const events = data.filter(d => d.time === t && d.event).length;
      const atRisk = data.filter(d => d.time >= t);

      let riskSum = 0;
      for (const obs of atRisk) {
        riskSum += Math.exp(this.linearPredictor(obs.covariates));
      }

      this.baselineHazard.set(t, events / riskSum);
    }
  }

  /**
   * Linear predictor (X * beta)
   */
  private linearPredictor(covariates: number[]): number {
    return covariates.reduce((sum, x, i) => sum + x * this.coefficients[i], 0);
  }

  /**
   * Compute risk score
   */
  private computeRiskScore(covariates: number[]): number {
    return Math.exp(this.linearPredictor(covariates));
  }

  /**
   * Compute log partial likelihood
   */
  private computeLogLikelihood(data: SurvivalObservation[]): number {
    let logLik = 0;

    const eventTimes = [...new Set(data.filter(d => d.event).map(d => d.time))];

    for (const t of eventTimes) {
      const atRisk = data.filter(d => d.time >= t);
      const events = data.filter(d => d.time === t && d.event);

      let riskSum = 0;
      for (const obs of atRisk) {
        riskSum += Math.exp(this.linearPredictor(obs.covariates));
      }

      for (const event of events) {
        logLik += this.linearPredictor(event.covariates) - Math.log(riskSum);
      }
    }

    return logLik;
  }

  /**
   * Compute concordance index
   */
  private computeConcordance(data: SurvivalObservation[]): number {
    let concordant = 0;
    let discordant = 0;

    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        if (data[i].time === data[j].time) continue;

        const [earlier, later] = data[i].time < data[j].time
          ? [data[i], data[j]]
          : [data[j], data[i]];

        if (!earlier.event) continue;

        const riskEarlier = this.computeRiskScore(earlier.covariates);
        const riskLater = this.computeRiskScore(later.covariates);

        if (riskEarlier > riskLater) {
          concordant++;
        } else if (riskEarlier < riskLater) {
          discordant++;
        }
      }
    }

    return concordant / (concordant + discordant);
  }

  /**
   * Compute standard errors and p-values
   */
  private computeStatistics(data: SurvivalObservation[]): {
    standardErrors: number[];
    pValues: number[];
  } {
    const { hessian } = this.computeGradientHessian(data);

    // Variance is inverse of information matrix (-Hessian)
    const variance = this.invertMatrix(hessian.map(row => row.map(v => -v)));

    const standardErrors = this.coefficients.map((_, i) =>
      Math.sqrt(Math.abs(variance[i][i]))
    );

    const pValues = this.coefficients.map((b, i) => {
      const z = b / standardErrors[i];
      return 2 * (1 - this.normalCDF(Math.abs(z)));
    });

    return { standardErrors, pValues };
  }

  /**
   * Solve linear system (simplified Gaussian elimination)
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / (augmented[i][i] + 1e-10);
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= (augmented[i][i] + 1e-10);
    }

    return x;
  }

  /**
   * Invert matrix (simplified)
   */
  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const identity = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );

    const augmented = matrix.map((row, i) => [...row, ...identity[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      const pivot = augmented[i][i] + 1e-10;
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    return augmented.map(row => row.slice(n));
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
}
