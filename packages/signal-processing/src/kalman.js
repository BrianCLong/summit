"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalmanFilter1D = void 0;
class KalmanFilter1D {
    processVariance;
    measurementVariance;
    estimationError;
    stateEstimate;
    constructor(initialEstimate, processVariance, measurementVariance) {
        this.processVariance = processVariance;
        this.measurementVariance = measurementVariance;
        this.stateEstimate = initialEstimate;
        this.estimationError = 1;
    }
    update(measurement) {
        const kalmanGain = this.estimationError / (this.estimationError + this.measurementVariance);
        this.stateEstimate = this.stateEstimate + kalmanGain * (measurement - this.stateEstimate);
        this.estimationError = (1 - kalmanGain) * (this.estimationError + this.processVariance);
        return this.stateEstimate;
    }
    filterSeries(series) {
        const output = [];
        for (const value of series) {
            output.push(this.update(value));
        }
        return Float64Array.from(output);
    }
}
exports.KalmanFilter1D = KalmanFilter1D;
