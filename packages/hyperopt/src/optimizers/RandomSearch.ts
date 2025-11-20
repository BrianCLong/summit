import { Optimizer, OptimizationStudy } from '../types';

/**
 * Random Search optimizer
 */
export class RandomSearchOptimizer implements Optimizer {
  getName(): string {
    return 'RandomSearch';
  }

  async suggest(study: OptimizationStudy): Promise<Record<string, any>> {
    const { searchSpace } = study.config;
    const sample: Record<string, any> = {};

    for (const param of searchSpace.parameters) {
      sample[param.name] = this.sampleParameter(param);
    }

    return sample;
  }

  update(_study: OptimizationStudy): void {
    // Random search doesn't learn from previous trials
  }

  private sampleParameter(param: any): any {
    switch (param.type) {
      case 'int':
        return this.randomInt(param.min, param.max, param.logScale);
      case 'float':
        return this.randomFloat(param.min, param.max, param.logScale);
      case 'categorical':
        return param.values[Math.floor(Math.random() * param.values.length)];
      case 'boolean':
        return Math.random() > 0.5;
      default:
        throw new Error(`Unknown parameter type: ${param.type}`);
    }
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
}
