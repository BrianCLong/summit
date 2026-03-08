"use strict";
// @ts-nocheck
/**
 * Hyperparameter Optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomSearchCV = exports.GridSearchCV = void 0;
/**
 * Grid Search for hyperparameter optimization
 */
class GridSearchCV {
    config;
    constructor(config = {}) {
        this.config = {
            nIterations: config.nIterations || 10,
            nFolds: config.nFolds || 5,
            scoringMetric: config.scoringMetric || 'accuracy',
            randomState: config.randomState,
        };
    }
    /**
     * Search over parameter grid
     */
    search(parameterSpace, modelFactory, dataset) {
        const paramGrid = this.generateParameterGrid(parameterSpace);
        const cvResults = [];
        let bestScore = -Infinity;
        let bestParams = {};
        for (const params of paramGrid) {
            const scores = this.crossValidate(modelFactory, params, dataset);
            const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const stdScore = this.std(scores);
            cvResults.push({ params, meanScore, stdScore });
            if (meanScore > bestScore) {
                bestScore = meanScore;
                bestParams = params;
            }
        }
        return {
            bestParams,
            bestScore,
            cvResults,
        };
    }
    /**
     * Generate parameter grid
     */
    generateParameterGrid(space) {
        const keys = Object.keys(space);
        const values = keys.map(k => space[k]);
        const grid = [];
        const generateCombinations = (index, current) => {
            if (index === keys.length) {
                grid.push({ ...current });
                return;
            }
            for (const value of values[index]) {
                current[keys[index]] = value;
                generateCombinations(index + 1, current);
            }
        };
        generateCombinations(0, {});
        return grid;
    }
    /**
     * K-fold cross validation
     */
    crossValidate(modelFactory, params, dataset) {
        const scores = [];
        const folds = this.createFolds(dataset, this.config.nFolds);
        for (let i = 0; i < this.config.nFolds; i++) {
            const trainFolds = folds.filter((_, idx) => idx !== i);
            const testFold = folds[i];
            const trainData = this.combineFolds(trainFolds);
            const model = modelFactory(params);
            model.fit(trainData);
            const performance = model.evaluate(testFold);
            scores.push(this.extractScore(performance));
        }
        return scores;
    }
    /**
     * Create K folds
     */
    createFolds(dataset, k) {
        const n = dataset.features.length;
        const foldSize = Math.floor(n / k);
        const indices = Array.from({ length: n }, (_, i) => i);
        // Shuffle indices
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const folds = [];
        for (let i = 0; i < k; i++) {
            const start = i * foldSize;
            const end = i === k - 1 ? n : (i + 1) * foldSize;
            const foldIndices = indices.slice(start, end);
            folds.push({
                features: foldIndices.map(idx => dataset.features[idx]),
                labels: foldIndices.map(idx => dataset.labels[idx]),
            });
        }
        return folds;
    }
    /**
     * Combine folds
     */
    combineFolds(folds) {
        return {
            features: folds.flatMap(f => f.features),
            labels: folds.flatMap(f => f.labels),
        };
    }
    /**
     * Extract score from performance metrics
     */
    extractScore(performance) {
        switch (this.config.scoringMetric) {
            case 'accuracy':
                return performance.accuracy || 0;
            case 'f1':
                return performance.f1Score || 0;
            case 'rmse':
                return -(performance.rmse || Infinity); // Negative because lower is better
            case 'r2':
                return performance.r2 || 0;
            default:
                return 0;
        }
    }
    std(arr) {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const squareDiffs = arr.map(x => Math.pow(x - mean, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    }
}
exports.GridSearchCV = GridSearchCV;
/**
 * Random Search for hyperparameter optimization
 */
class RandomSearchCV {
    config;
    constructor(config = {}) {
        this.config = {
            nIterations: config.nIterations || 10,
            nFolds: config.nFolds || 5,
            scoringMetric: config.scoringMetric || 'accuracy',
            randomState: config.randomState,
        };
    }
    /**
     * Random search over parameter distributions
     */
    search(parameterSpace, modelFactory, dataset) {
        const cvResults = [];
        let bestScore = -Infinity;
        let bestParams = {};
        for (let iter = 0; iter < this.config.nIterations; iter++) {
            const params = this.sampleParameters(parameterSpace);
            const scores = this.crossValidate(modelFactory, params, dataset);
            const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const stdScore = this.std(scores);
            cvResults.push({ params, meanScore, stdScore });
            if (meanScore > bestScore) {
                bestScore = meanScore;
                bestParams = params;
            }
        }
        return {
            bestParams,
            bestScore,
            cvResults,
        };
    }
    /**
     * Sample random parameters
     */
    sampleParameters(space) {
        const params = {};
        for (const [key, values] of Object.entries(space)) {
            const randomIndex = Math.floor(Math.random() * values.length);
            params[key] = values[randomIndex];
        }
        return params;
    }
    crossValidate(modelFactory, params, dataset) {
        const scores = [];
        const folds = this.createFolds(dataset, this.config.nFolds);
        for (let i = 0; i < this.config.nFolds; i++) {
            const trainFolds = folds.filter((_, idx) => idx !== i);
            const testFold = folds[i];
            const trainData = this.combineFolds(trainFolds);
            const model = modelFactory(params);
            model.fit(trainData);
            const performance = model.evaluate(testFold);
            scores.push(this.extractScore(performance));
        }
        return scores;
    }
    createFolds(dataset, k) {
        const n = dataset.features.length;
        const foldSize = Math.floor(n / k);
        const indices = Array.from({ length: n }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const folds = [];
        for (let i = 0; i < k; i++) {
            const start = i * foldSize;
            const end = i === k - 1 ? n : (i + 1) * foldSize;
            const foldIndices = indices.slice(start, end);
            folds.push({
                features: foldIndices.map(idx => dataset.features[idx]),
                labels: foldIndices.map(idx => dataset.labels[idx]),
            });
        }
        return folds;
    }
    combineFolds(folds) {
        return {
            features: folds.flatMap(f => f.features),
            labels: folds.flatMap(f => f.labels),
        };
    }
    extractScore(performance) {
        switch (this.config.scoringMetric) {
            case 'accuracy':
                return performance.accuracy || 0;
            case 'f1':
                return performance.f1Score || 0;
            case 'rmse':
                return -(performance.rmse || Infinity);
            case 'r2':
                return performance.r2 || 0;
            default:
                return 0;
        }
    }
    std(arr) {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const squareDiffs = arr.map(x => Math.pow(x - mean, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    }
}
exports.RandomSearchCV = RandomSearchCV;
