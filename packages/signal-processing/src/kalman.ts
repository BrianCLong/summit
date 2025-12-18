export class KalmanFilter1D {
  private estimationError: number;

  private stateEstimate: number;

  constructor(initialEstimate: number, private readonly processVariance: number, private readonly measurementVariance: number) {
    this.stateEstimate = initialEstimate;
    this.estimationError = 1;
  }

  update(measurement: number): number {
    const kalmanGain = this.estimationError / (this.estimationError + this.measurementVariance);
    this.stateEstimate = this.stateEstimate + kalmanGain * (measurement - this.stateEstimate);
    this.estimationError = (1 - kalmanGain) * (this.estimationError + this.processVariance);
    return this.stateEstimate;
  }

  filterSeries(series: Iterable<number>): Float64Array {
    const output: number[] = [];
    for (const value of series) {
      output.push(this.update(value));
    }
    return Float64Array.from(output);
  }
}
