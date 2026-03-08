"use strict";
/**
 * Isolation Forest implementation for anomaly detection
 * Based on the paper: "Isolation Forest" by Liu, Ting, and Zhou (2008)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsolationForest = void 0;
class IsolationForest {
    config;
    forest = [];
    features = [];
    trained = false;
    trainingData = [];
    constructor(config) {
        this.config = config;
        this.config.maxDepth = config.maxDepth || Math.ceil(Math.log2(config.sampleSize));
    }
    async detectAnomaly(data) {
        if (!this.trained) {
            return {
                score: 0,
                isolationScore: 0,
                method: 'isolation_forest',
                features: {},
                explanation: 'Model not trained yet'
            };
        }
        // Extract feature vector
        const featureVector = this.extractFeatures(data);
        // Calculate average path length across all trees
        const avgPathLength = this.getAveragePathLength(featureVector);
        // Normalize path length to anomaly score
        const c = this.averagePathLength(this.config.sampleSize);
        const anomalyScore = Math.pow(2, -avgPathLength / c);
        // Calculate per-feature importance
        const featureImportance = this.calculateFeatureImportance(featureVector);
        return {
            score: anomalyScore,
            isolationScore: avgPathLength,
            method: 'isolation_forest',
            features: featureImportance,
            explanation: this.generateExplanation(anomalyScore, featureImportance)
        };
    }
    async updateBaseline(data) {
        // Extract features
        const featureVector = this.extractFeatures(data);
        // Add to training data
        this.trainingData.push(featureVector);
        // Retrain if we have enough samples
        if (this.trainingData.length >= this.config.sampleSize) {
            await this.train();
        }
    }
    async getBaseline() {
        return {
            numTrees: this.config.numTrees,
            sampleSize: this.config.sampleSize,
            maxDepth: this.config.maxDepth,
            trained: this.trained,
            trainingDataSize: this.trainingData.length,
            features: this.features
        };
    }
    async train() {
        if (this.trainingData.length < this.config.sampleSize) {
            throw new Error('Insufficient training data');
        }
        // Build isolation trees
        this.forest = [];
        for (let i = 0; i < this.config.numTrees; i++) {
            // Sample data
            const sample = this.sampleData(this.trainingData, this.config.sampleSize);
            // Build tree
            const tree = this.buildTree(sample, 0);
            this.forest.push(tree);
        }
        this.trained = true;
    }
    extractFeatures(data) {
        if (this.features.length === 0) {
            // First time - determine features
            this.features = Object.keys(data).filter(key => typeof data[key] === 'number');
        }
        return this.features.map(feature => data[feature] || 0);
    }
    sampleData(data, size) {
        const sample = [];
        const indices = new Set();
        while (indices.size < Math.min(size, data.length)) {
            const index = Math.floor(Math.random() * data.length);
            if (!indices.has(index)) {
                indices.add(index);
                sample.push(data[index]);
            }
        }
        return sample;
    }
    buildTree(data, currentDepth) {
        // Stopping criteria
        if (currentDepth >= this.config.maxDepth || data.length <= 1) {
            return { size: data.length };
        }
        // Randomly select feature and split value
        const featureIndex = Math.floor(Math.random() * this.features.length);
        const featureValues = data.map(row => row[featureIndex]);
        const minVal = Math.min(...featureValues);
        const maxVal = Math.max(...featureValues);
        if (minVal === maxVal) {
            return { size: data.length };
        }
        const splitValue = minVal + Math.random() * (maxVal - minVal);
        // Split data
        const leftData = data.filter(row => row[featureIndex] < splitValue);
        const rightData = data.filter(row => row[featureIndex] >= splitValue);
        if (leftData.length === 0 || rightData.length === 0) {
            return { size: data.length };
        }
        return {
            splitFeature: featureIndex,
            splitValue,
            left: this.buildTree(leftData, currentDepth + 1),
            right: this.buildTree(rightData, currentDepth + 1)
        };
    }
    getPathLength(featureVector, tree, currentDepth = 0) {
        // Leaf node
        if (tree.size !== undefined) {
            return currentDepth + this.averagePathLength(tree.size);
        }
        // Traverse tree
        const featureValue = featureVector[tree.splitFeature];
        if (featureValue < tree.splitValue) {
            return this.getPathLength(featureVector, tree.left, currentDepth + 1);
        }
        else {
            return this.getPathLength(featureVector, tree.right, currentDepth + 1);
        }
    }
    getAveragePathLength(featureVector) {
        const pathLengths = this.forest.map(tree => this.getPathLength(featureVector, tree));
        return pathLengths.reduce((sum, length) => sum + length, 0) / this.forest.length;
    }
    averagePathLength(n) {
        if (n <= 1)
            return 0;
        if (n === 2)
            return 1;
        // Harmonic number approximation
        const harmonicNumber = Math.log(n - 1) + 0.5772156649; // Euler's constant
        return 2 * harmonicNumber - (2 * (n - 1) / n);
    }
    calculateFeatureImportance(featureVector) {
        const importance = {};
        // Initialize all features
        this.features.forEach(feature => {
            importance[feature] = 0;
        });
        // Count how often each feature is used for splitting
        for (const tree of this.forest) {
            this.traverseTree(tree, importance);
        }
        // Normalize
        const total = Object.values(importance).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            Object.keys(importance).forEach(key => {
                importance[key] /= total;
            });
        }
        return importance;
    }
    traverseTree(tree, importance) {
        if (tree.splitFeature !== undefined) {
            const feature = this.features[tree.splitFeature];
            importance[feature] = (importance[feature] || 0) + 1;
            if (tree.left)
                this.traverseTree(tree.left, importance);
            if (tree.right)
                this.traverseTree(tree.right, importance);
        }
    }
    generateExplanation(score, featureImportance) {
        if (score < 0.5) {
            return 'Data point appears normal';
        }
        const topFeatures = Object.entries(featureImportance)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 3)
            .map(([feature]) => feature);
        return `Anomaly detected (isolation score: ${score.toFixed(2)}). Key features: ${topFeatures.join(', ')}`;
    }
    reset() {
        this.forest = [];
        this.features = [];
        this.trained = false;
        this.trainingData = [];
    }
    setTrainingData(data) {
        this.trainingData = data.map(d => this.extractFeatures(d));
    }
}
exports.IsolationForest = IsolationForest;
