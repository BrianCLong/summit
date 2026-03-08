"use strict";
/**
 * Feature Scalers and Normalizers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinMaxScaler = exports.StandardScaler = void 0;
class StandardScaler {
    mean = [];
    std = [];
    fitted = false;
    /**
     * Fit scaler to data
     */
    fit(data) {
        const nFeatures = data[0].length;
        this.mean = new Array(nFeatures).fill(0);
        this.std = new Array(nFeatures).fill(0);
        // Calculate means
        for (const sample of data) {
            for (let j = 0; j < nFeatures; j++) {
                this.mean[j] += sample[j];
            }
        }
        this.mean = this.mean.map(m => m / data.length);
        // Calculate standard deviations
        for (const sample of data) {
            for (let j = 0; j < nFeatures; j++) {
                this.std[j] += Math.pow(sample[j] - this.mean[j], 2);
            }
        }
        this.std = this.std.map(s => Math.sqrt(s / data.length));
        this.fitted = true;
    }
    /**
     * Transform data
     */
    transform(data) {
        if (!this.fitted) {
            throw new Error('Scaler must be fitted before transformation');
        }
        return data.map(sample => sample.map((x, j) => this.std[j] > 0 ? (x - this.mean[j]) / this.std[j] : 0));
    }
    /**
     * Fit and transform in one step
     */
    fitTransform(data) {
        this.fit(data);
        return this.transform(data);
    }
}
exports.StandardScaler = StandardScaler;
class MinMaxScaler {
    min = [];
    max = [];
    fitted = false;
    fit(data) {
        const nFeatures = data[0].length;
        this.min = new Array(nFeatures).fill(Infinity);
        this.max = new Array(nFeatures).fill(-Infinity);
        for (const sample of data) {
            for (let j = 0; j < nFeatures; j++) {
                this.min[j] = Math.min(this.min[j], sample[j]);
                this.max[j] = Math.max(this.max[j], sample[j]);
            }
        }
        this.fitted = true;
    }
    transform(data) {
        if (!this.fitted) {
            throw new Error('Scaler must be fitted before transformation');
        }
        return data.map(sample => sample.map((x, j) => {
            const range = this.max[j] - this.min[j];
            return range > 0 ? (x - this.min[j]) / range : 0;
        }));
    }
    fitTransform(data) {
        this.fit(data);
        return this.transform(data);
    }
}
exports.MinMaxScaler = MinMaxScaler;
