import { Optimizer, OptimizationStudy, TrialResult } from '../types';

/**
 * Bayesian Optimization using Gaussian Processes
 */
export class BayesianOptimizer implements Optimizer {
  private acquisitionFunction: 'ei' | 'ucb' | 'poi';
  private xi: number;
  private kappa: number;

  constructor(config: {
    acquisitionFunction?: 'ei' | 'ucb' | 'poi';
    xi?: number;
    kappa?: number;
  } = {}) {
    this.acquisitionFunction = config.acquisitionFunction || 'ei';
    this.xi = config.xi || 0.01;
    this.kappa = config.kappa || 2.576;
  }

  getName(): string {
    return 'BayesianOptimizer';
  }

  /**
   * Suggest next hyperparameter configuration
   */
  async suggest(study: OptimizationStudy): Promise<Record<string, any>> {
    const { searchSpace } = study.config;

    // If no trials yet, suggest random configuration
    if (study.trials.length === 0) {
      return this.randomSample(searchSpace.parameters);
    }

    // Build Gaussian Process surrogate model
    const completedTrials = study.trials.filter(t => t.status === 'completed');

    if (completedTrials.length < 3) {
      // Need more data for GP, use random sampling
      return this.randomSample(searchSpace.parameters);
    }

    // Extract training data
    const X = completedTrials.map(t => this.parameterVectorize(t.parameters, searchSpace.parameters));
    const y = completedTrials.map(t => t.score);

    // Fit Gaussian Process (simplified version)
    const gp = this.fitGaussianProcess(X, y);

    // Optimize acquisition function
    const nextParams = await this.optimizeAcquisition(
      gp,
      searchSpace.parameters,
      study.config.objective === 'maximize',
      y
    );

    return nextParams;
  }

  /**
   * Update optimizer with new trial result
   */
  update(study: OptimizationStudy, trial: TrialResult): void {
    // In a real implementation, this would update the GP model
    // Silently track completed trials
    if (trial.status === 'completed') {
      // Update internal GP state here
    }
  }

  // Private helper methods

  private randomSample(parameters: any[]): Record<string, any> {
    const sample: Record<string, any> = {};

    for (const param of parameters) {
      switch (param.type) {
        case 'int':
          sample[param.name] = this.randomInt(param.min, param.max, param.logScale);
          break;
        case 'float':
          sample[param.name] = this.randomFloat(param.min, param.max, param.logScale);
          break;
        case 'categorical':
          sample[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
          break;
        case 'boolean':
          sample[param.name] = Math.random() > 0.5;
          break;
      }
    }

    return sample;
  }

  private randomInt(min: number, max: number, logScale?: boolean): number {
    if (logScale) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return Math.round(Math.exp(Math.random() * (logMax - logMin) + logMin));
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number, logScale?: boolean): number {
    if (logScale) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return Math.exp(Math.random() * (logMax - logMin) + logMin);
    }
    return Math.random() * (max - min) + min;
  }

  private parameterVectorize(params: Record<string, any>, paramDefs: any[]): number[] {
    const vector: number[] = [];

    for (const def of paramDefs) {
      const value = params[def.name];

      switch (def.type) {
        case 'int':
        case 'float': {
          // Normalize to [0, 1]
          let normalized = (value - def.min) / (def.max - def.min);
          if (def.logScale) {
            normalized = (Math.log(value) - Math.log(def.min)) /
                        (Math.log(def.max) - Math.log(def.min));
          }
          vector.push(normalized);
          break;
        }
        case 'categorical': {
          // One-hot encoding
          const index = def.values.indexOf(value);
          for (let i = 0; i < def.values.length; i++) {
            vector.push(i === index ? 1 : 0);
          }
          break;
        }
        case 'boolean':
          vector.push(value ? 1 : 0);
          break;
      }
    }

    return vector;
  }

  private fitGaussianProcess(X: number[][], y: number[]): GaussianProcess {
    // Simplified GP implementation
    // In production, use a proper library like gaussian-process or scikit-optimize

    // Calculate mean and std of observations
    const mean = y.reduce((sum, val) => sum + val, 0) / y.length;
    const variance = y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / y.length;
    const std = Math.sqrt(variance);

    return {
      X,
      y,
      mean,
      std,
      kernelFunction: this.rbfKernel.bind(this),
    };
  }

  private rbfKernel(x1: number[], x2: number[], lengthScale: number = 1.0): number {
    // RBF (Gaussian) kernel
    let sumSquaredDiff = 0;
    for (let i = 0; i < x1.length; i++) {
      sumSquaredDiff += Math.pow(x1[i] - x2[i], 2);
    }
    return Math.exp(-sumSquaredDiff / (2 * lengthScale * lengthScale));
  }

  private gpPredict(gp: GaussianProcess, x: number[]): { mean: number; std: number } {
    // Simplified GP prediction
    // Calculate similarity to all training points
    const similarities = gp.X.map(xi => gp.kernelFunction(x, xi));
    const totalSimilarity = similarities.reduce((sum, s) => sum + s, 0);

    // Weighted average of observed values
    let predictedMean = 0;
    for (let i = 0; i < gp.y.length; i++) {
      predictedMean += (similarities[i] / totalSimilarity) * gp.y[i];
    }

    // Estimate uncertainty based on distance to nearest points
    const maxSimilarity = Math.max(...similarities);
    const predictedStd = gp.std * (1 - maxSimilarity);

    return {
      mean: predictedMean,
      std: predictedStd,
    };
  }

  private async optimizeAcquisition(
    gp: GaussianProcess,
    paramDefs: any[],
    maximize: boolean,
    currentBest: number[]
  ): Promise<Record<string, any>> {
    // Optimize acquisition function using random search
    // In production, use proper optimization (e.g., L-BFGS-B)

    const numSamples = 1000;
    let bestScore = -Infinity;
    let bestParams: Record<string, any> = {};

    const yBest = maximize ? Math.max(...currentBest) : Math.min(...currentBest);

    for (let i = 0; i < numSamples; i++) {
      const candidate = this.randomSample(paramDefs);
      const x = this.parameterVectorize(candidate, paramDefs);

      const { mean, std } = this.gpPredict(gp, x);

      let acquisitionScore = 0;

      switch (this.acquisitionFunction) {
        case 'ei': // Expected Improvement
          acquisitionScore = this.expectedImprovement(mean, std, yBest, maximize);
          break;
        case 'ucb': // Upper Confidence Bound
          acquisitionScore = this.upperConfidenceBound(mean, std, maximize);
          break;
        case 'poi': // Probability of Improvement
          acquisitionScore = this.probabilityOfImprovement(mean, std, yBest, maximize);
          break;
      }

      if (acquisitionScore > bestScore) {
        bestScore = acquisitionScore;
        bestParams = candidate;
      }
    }

    return bestParams;
  }

  private expectedImprovement(
    mean: number,
    std: number,
    yBest: number,
    maximize: boolean
  ): number {
    if (std === 0) return 0;

    const improvement = maximize ? mean - yBest : yBest - mean;
    const z = (improvement - this.xi) / std;

    // Simplified EI calculation (normally would use error function)
    const phi = this.gaussianPDF(z);
    const Phi = this.gaussianCDF(z);

    return improvement * Phi + std * phi;
  }

  private upperConfidenceBound(mean: number, std: number, maximize: boolean): number {
    return maximize ? mean + this.kappa * std : -(mean - this.kappa * std);
  }

  private probabilityOfImprovement(
    mean: number,
    std: number,
    yBest: number,
    maximize: boolean
  ): number {
    if (std === 0) return 0;

    const improvement = maximize ? mean - yBest : yBest - mean;
    const z = (improvement - this.xi) / std;

    return this.gaussianCDF(z);
  }

  private gaussianPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  private gaussianCDF(x: number): number {
    // Approximation of the cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Abramowitz and Stegun approximation
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }
}

interface GaussianProcess {
  X: number[][];
  y: number[];
  mean: number;
  std: number;
  kernelFunction: (x1: number[], x2: number[], lengthScale?: number) => number;
}
