"use strict";
/**
 * DataProfiler - Analyze and profile datasets for synthesis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProfiler = void 0;
/**
 * Data Profiler class
 */
class DataProfiler {
    /**
     * Profile a tabular dataset
     */
    static profile(data) {
        const { columns, data: rows } = data;
        const columnProfiles = columns.map((col, idx) => {
            return this.profileColumn(col, rows.map(row => row[idx]));
        });
        const correlations = this.computeCorrelations(data, columnProfiles);
        const quality = this.assessQuality(rows, columnProfiles);
        return {
            numRows: rows.length,
            numColumns: columns.length,
            columns: columnProfiles,
            correlations,
            quality
        };
    }
    /**
     * Profile a single column
     */
    static profileColumn(name, values) {
        const nullCount = values.filter(v => v === null || v === undefined).length;
        const nonNullValues = values.filter(v => v !== null && v !== undefined);
        const uniqueCount = new Set(nonNullValues).size;
        // Determine column type
        const type = this.inferColumnType(nonNullValues);
        const profile = {
            name,
            type,
            nullCount,
            nullPercentage: (nullCount / values.length) * 100,
            uniqueCount,
            uniquePercentage: (uniqueCount / values.length) * 100
        };
        // Add type-specific statistics
        if (type === 'numerical') {
            profile.statistics = this.computeNumericalStatistics(nonNullValues);
        }
        else if (type === 'categorical') {
            profile.distribution = this.computeCategoricalDistribution(nonNullValues);
        }
        return profile;
    }
    /**
     * Infer column type
     */
    static inferColumnType(values) {
        if (values.length === 0) {
            return 'categorical';
        }
        // Check if numerical
        const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
        if (numericValues.length / values.length > 0.8) {
            return 'numerical';
        }
        // Check if datetime
        const dateValues = values.filter(v => v instanceof Date || this.isDateString(v));
        if (dateValues.length / values.length > 0.8) {
            return 'datetime';
        }
        // Check if text (long strings)
        const textValues = values.filter(v => typeof v === 'string' && v.length > 50);
        if (textValues.length / values.length > 0.5) {
            return 'text';
        }
        return 'categorical';
    }
    /**
     * Check if string is a date
     */
    static isDateString(value) {
        if (typeof value !== 'string') {
            return false;
        }
        const date = new Date(value);
        return !isNaN(date.getTime());
    }
    /**
     * Compute numerical statistics
     */
    static computeNumericalStatistics(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const n = values.length;
        const mean = values.reduce((sum, v) => sum + v, 0) / n;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
        const std = Math.sqrt(variance);
        const q25 = sorted[Math.floor(n * 0.25)];
        const median = sorted[Math.floor(n * 0.5)];
        const q75 = sorted[Math.floor(n * 0.75)];
        // Skewness and kurtosis
        const skewness = this.computeSkewness(values, mean, std);
        const kurtosis = this.computeKurtosis(values, mean, std);
        return {
            mean,
            median,
            std,
            min: sorted[0],
            max: sorted[n - 1],
            q25,
            q75,
            skewness,
            kurtosis
        };
    }
    /**
     * Compute categorical distribution
     */
    static computeCategoricalDistribution(values) {
        const counts = new Map();
        values.forEach(v => {
            const key = String(v);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        // Sort by count
        const sorted = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10
        const topValues = sorted.map(([value, count]) => ({
            value,
            count,
            percentage: (count / values.length) * 100
        }));
        // Compute entropy
        const entropy = this.computeEntropy(Array.from(counts.values()), values.length);
        return {
            topValues,
            entropy
        };
    }
    /**
     * Compute correlations
     */
    static computeCorrelations(data, profiles) {
        const numericalColumns = profiles
            .filter(p => p.type === 'numerical')
            .map(p => p.name);
        const n = numericalColumns.length;
        const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
        // Compute Pearson correlation
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 1.0;
                }
                else if (i < j) {
                    const colI = data.columns.indexOf(numericalColumns[i]);
                    const colJ = data.columns.indexOf(numericalColumns[j]);
                    const valuesI = data.data.map(row => row[colI]).filter(v => typeof v === 'number');
                    const valuesJ = data.data.map(row => row[colJ]).filter(v => typeof v === 'number');
                    matrix[i][j] = this.pearsonCorrelation(valuesI, valuesJ);
                    matrix[j][i] = matrix[i][j];
                }
            }
        }
        return {
            columns: numericalColumns,
            matrix
        };
    }
    /**
     * Assess data quality
     */
    static assessQuality(rows, profiles) {
        // Completeness: percentage of non-null values
        const totalCells = rows.length * profiles.length;
        const nullCells = profiles.reduce((sum, p) => sum + p.nullCount, 0);
        const completeness = ((totalCells - nullCells) / totalCells) * 100;
        // Uniqueness: average uniqueness across columns
        const uniqueness = profiles.reduce((sum, p) => sum + p.uniquePercentage, 0) / profiles.length;
        // Validity: placeholder (would check against business rules)
        const validity = 95.0;
        // Consistency: placeholder (would check cross-column consistency)
        const consistency = 90.0;
        const overallScore = (completeness + uniqueness + validity + consistency) / 4;
        return {
            completeness,
            uniqueness,
            validity,
            consistency,
            overallScore
        };
    }
    // Statistical helper methods
    static computeSkewness(values, mean, std) {
        const n = values.length;
        const sum = values.reduce((s, v) => s + Math.pow((v - mean) / std, 3), 0);
        return (n / ((n - 1) * (n - 2))) * sum;
    }
    static computeKurtosis(values, mean, std) {
        const n = values.length;
        const sum = values.reduce((s, v) => s + Math.pow((v - mean) / std, 4), 0);
        return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sum -
            (3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3)));
    }
    static computeEntropy(counts, total) {
        return counts.reduce((entropy, count) => {
            const p = count / total;
            return entropy - (p > 0 ? p * Math.log2(p) : 0);
        }, 0);
    }
    static pearsonCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n === 0) {
            return 0;
        }
        const meanX = x.reduce((sum, v) => sum + v, 0) / n;
        const meanY = y.reduce((sum, v) => sum + v, 0) / n;
        let numerator = 0;
        let denomX = 0;
        let denomY = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            numerator += dx * dy;
            denomX += dx * dx;
            denomY += dy * dy;
        }
        const denominator = Math.sqrt(denomX * denomY);
        return denominator === 0 ? 0 : numerator / denominator;
    }
}
exports.DataProfiler = DataProfiler;
exports.default = DataProfiler;
