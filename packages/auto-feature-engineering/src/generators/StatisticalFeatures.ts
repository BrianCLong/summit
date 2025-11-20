export class StatisticalFeatures {
  generate(data: number[][]): Record<string, number[]> {
    const transpose = this.transpose(data);
    return {
      mean: transpose.map(col => this.mean(col)),
      std: transpose.map(col => this.std(col)),
      skewness: transpose.map(col => this.skewness(col)),
      kurtosis: transpose.map(col => this.kurtosis(col)),
    };
  }

  private transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private std(values: number[]): number {
    const avg = this.mean(values);
    return Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
  }

  private skewness(values: number[]): number {
    const avg = this.mean(values);
    const sd = this.std(values);
    return values.reduce((sum, val) => sum + Math.pow((val - avg) / sd, 3), 0) / values.length;
  }

  private kurtosis(values: number[]): number {
    const avg = this.mean(values);
    const sd = this.std(values);
    return values.reduce((sum, val) => sum + Math.pow((val - avg) / sd, 4), 0) / values.length - 3;
  }
}
