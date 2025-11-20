import { Optimizer, OptimizationStudy } from '../types';

/**
 * Grid Search optimizer
 */
export class GridSearchOptimizer implements Optimizer {
  private gridPoints: Record<string, any>[] = [];
  private currentIndex = 0;

  constructor(private numPoints: number = 10) {}

  getName(): string {
    return 'GridSearch';
  }

  async suggest(study: OptimizationStudy): Promise<Record<string, any>> {
    // Generate grid on first call
    if (this.gridPoints.length === 0) {
      this.gridPoints = this.generateGrid(study.config.searchSpace.parameters);
    }

    if (this.currentIndex >= this.gridPoints.length) {
      // Grid exhausted, wrap around or throw error
      this.currentIndex = 0;
    }

    return this.gridPoints[this.currentIndex++];
  }

  update(_study: OptimizationStudy): void {
    // Grid search doesn't learn from previous trials
  }

  private generateGrid(parameters: any[]): Record<string, any>[] {
    const grids: any[][] = [];

    for (const param of parameters) {
      grids.push(this.generateParameterGrid(param));
    }

    // Generate Cartesian product of all parameter grids
    return this.cartesianProduct(grids, parameters.map(p => p.name));
  }

  private generateParameterGrid(param: any): any[] {
    switch (param.type) {
      case 'int':
        return this.intGrid(param.min, param.max, this.numPoints, param.logScale);
      case 'float':
        return this.floatGrid(param.min, param.max, this.numPoints, param.logScale);
      case 'categorical':
        return param.values;
      case 'boolean':
        return [true, false];
      default:
        throw new Error(`Unknown parameter type: ${param.type}`);
    }
  }

  private intGrid(min: number, max: number, numPoints: number, logScale?: boolean): number[] {
    const grid: number[] = [];
    const actualNumPoints = Math.min(numPoints, max - min + 1);

    if (logScale) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      for (let i = 0; i < actualNumPoints; i++) {
        const logValue = logMin + (i / (actualNumPoints - 1)) * (logMax - logMin);
        grid.push(Math.round(Math.exp(logValue)));
      }
    } else {
      for (let i = 0; i < actualNumPoints; i++) {
        grid.push(Math.round(min + (i / (actualNumPoints - 1)) * (max - min)));
      }
    }

    return [...new Set(grid)]; // Remove duplicates
  }

  private floatGrid(min: number, max: number, numPoints: number, logScale?: boolean): number[] {
    const grid: number[] = [];

    if (logScale) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      for (let i = 0; i < numPoints; i++) {
        const logValue = logMin + (i / (numPoints - 1)) * (logMax - logMin);
        grid.push(Math.exp(logValue));
      }
    } else {
      for (let i = 0; i < numPoints; i++) {
        grid.push(min + (i / (numPoints - 1)) * (max - min));
      }
    }

    return grid;
  }

  private cartesianProduct(arrays: any[][], names: string[]): Record<string, any>[] {
    if (arrays.length === 0) return [{}];
    if (arrays.length === 1) {
      return arrays[0].map(val => ({ [names[0]]: val }));
    }

    const [first, ...rest] = arrays;
    const [firstName, ...restNames] = names;
    const restProduct = this.cartesianProduct(rest, restNames);

    const result: Record<string, any>[] = [];
    for (const firstVal of first) {
      for (const restVal of restProduct) {
        result.push({ [firstName]: firstVal, ...restVal });
      }
    }

    return result;
  }
}
