"use strict";
/**
 * Model Training Pipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingPipeline = void 0;
const feature_engineering_1 = require("@intelgraph/feature-engineering");
const predictive_models_1 = require("@intelgraph/predictive-models");
class TrainingPipeline {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Train a model end-to-end
     */
    async train(data, modelFactory) {
        console.log('Starting training pipeline...');
        // Step 1: Feature Engineering
        let processedData = data;
        if (this.config.featureEngineering) {
            processedData = await this.engineerFeatures(data);
        }
        // Step 2: Split data
        const { train, test } = this.splitData(processedData, this.config.testSize);
        // Step 3: Hyperparameter Tuning (optional)
        let bestParams = {};
        if (this.config.hyperparameterTuning) {
            const tuningResult = await this.tuneHyperparameters(train, modelFactory);
            bestParams = tuningResult.bestParams;
        }
        // Step 4: Train final model
        const model = modelFactory(bestParams);
        model.fit(train);
        // Step 5: Evaluate
        const performance = model.evaluate(test);
        console.log('Training complete!', performance);
        return {
            modelId: `model_${Date.now()}`,
            version: '1.0.0',
            performance,
            bestParams,
            features: processedData.featureNames,
            trainedAt: new Date(),
        };
    }
    /**
     * Engineer features
     */
    async engineerFeatures(data) {
        console.log('Engineering features...');
        const generator = new feature_engineering_1.AutomatedFeatureGenerator();
        const scaler = new feature_engineering_1.StandardScaler();
        // Generate polynomial features
        const polyFeatures = generator.generatePolynomialFeatures(data.features, 2);
        // Scale features
        const scaledFeatures = scaler.fitTransform(polyFeatures.features);
        return {
            features: scaledFeatures,
            labels: data.labels,
            featureNames: polyFeatures.featureNames,
        };
    }
    /**
     * Split data into train and test sets
     */
    splitData(data, testSize) {
        const splitIndex = Math.floor(data.features.length * (1 - testSize));
        return {
            train: {
                features: data.features.slice(0, splitIndex),
                labels: data.labels.slice(0, splitIndex),
                featureNames: data.featureNames,
            },
            test: {
                features: data.features.slice(splitIndex),
                labels: data.labels.slice(splitIndex),
                featureNames: data.featureNames,
            },
        };
    }
    /**
     * Tune hyperparameters
     */
    async tuneHyperparameters(data, modelFactory) {
        console.log('Tuning hyperparameters...');
        const gridSearch = new predictive_models_1.GridSearchCV({
            nFolds: this.config.crossValidation,
            scoringMetric: this.config.modelType === 'classification' ? 'accuracy' : 'r2',
        });
        // Define parameter space (example for Random Forest)
        const parameterSpace = {
            nEstimators: [50, 100, 200],
            maxDepth: [5, 10, 20],
            minSamplesSplit: [2, 5, 10],
        };
        const result = gridSearch.search(parameterSpace, modelFactory, data);
        console.log('Best parameters:', result.bestParams);
        console.log('Best score:', result.bestScore);
        return {
            bestParams: result.bestParams,
            bestScore: result.bestScore,
        };
    }
}
exports.TrainingPipeline = TrainingPipeline;
