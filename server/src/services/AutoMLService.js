"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoMLService = exports.AutoMLService = void 0;
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class AutoMLService {
    models = new Map();
    jobs = new Map();
    storageDir;
    modelsFile;
    jobsFile;
    constructor(storagePath = './data/automl') {
        this.storageDir = path_1.default.resolve(storagePath);
        this.modelsFile = path_1.default.join(this.storageDir, 'models.json');
        this.jobsFile = path_1.default.join(this.storageDir, 'jobs.json');
        this.initializeStorage();
        this.loadState();
    }
    initializeStorage() {
        if (!fs_1.default.existsSync(this.storageDir)) {
            try {
                fs_1.default.mkdirSync(this.storageDir, { recursive: true });
            }
            catch (err) {
                // Fallback for environments where we can't write to ./data
                this.storageDir = '/tmp/automl';
                fs_1.default.mkdirSync(this.storageDir, { recursive: true });
            }
        }
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(this.modelsFile)) {
                const data = JSON.parse(fs_1.default.readFileSync(this.modelsFile, 'utf-8'));
                this.models = new Map(data.map((m) => [m.id, m]));
            }
            else {
                this.initializeDefaultModels();
            }
            if (fs_1.default.existsSync(this.jobsFile)) {
                const data = JSON.parse(fs_1.default.readFileSync(this.jobsFile, 'utf-8'));
                this.jobs = new Map(data.map((j) => [j.id, j]));
            }
        }
        catch (error) {
            console.error('Failed to load AutoML state:', error);
            this.initializeDefaultModels();
        }
    }
    saveState() {
        try {
            fs_1.default.writeFileSync(this.modelsFile, JSON.stringify(Array.from(this.models.values()), null, 2));
            fs_1.default.writeFileSync(this.jobsFile, JSON.stringify(Array.from(this.jobs.values()), null, 2));
        }
        catch (error) {
            console.error('Failed to save AutoML state:', error);
        }
    }
    initializeDefaultModels() {
        if (this.models.size === 0) {
            this.createModel({
                name: 'Entity Classifier',
                type: 'classification',
                description: 'Classifies entities into person, organization, location, etc.',
            });
            this.createModel({
                name: 'Threat Level Predictor',
                type: 'regression',
                description: 'Predicts the threat level (0-1) of a given entity.',
            });
        }
    }
    /**
     * Register a new model definition
     */
    createModel(params) {
        const id = (0, uuid_1.v4)();
        const model = {
            id,
            name: params.name,
            type: params.type,
            description: params.description,
            versions: [],
            createdAt: new Date().toISOString(),
        };
        this.models.set(id, model);
        this.saveState();
        return model;
    }
    /**
     * Get a model by ID
     */
    getModel(id) {
        return this.models.get(id);
    }
    /**
     * List all models
     */
    listModels() {
        return Array.from(this.models.values());
    }
    /**
     * Start a training job for a model
     */
    async startTraining(modelId, datasetId, hyperparameters = {}) {
        const model = this.models.get(modelId);
        if (!model)
            throw new Error(`Model ${modelId} not found`);
        const jobId = (0, uuid_1.v4)();
        const job = {
            id: jobId,
            modelId,
            datasetId,
            status: 'pending',
            progress: 0,
            startTime: new Date().toISOString(),
            logs: ['Job initialized'],
        };
        this.jobs.set(jobId, job);
        this.saveState();
        // Simulate async training process
        this.runTrainingSimulation(jobId, hyperparameters);
        return job;
    }
    async runTrainingSimulation(jobId, hyperparameters) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        job.status = 'running';
        job.logs.push('Starting training...');
        this.saveState();
        // Simulate steps
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s per step
            job.progress = (i / steps) * 100;
            job.logs.push(`Epoch ${i}/${steps} completed. Loss: ${(1 / i).toFixed(4)}`);
            this.saveState();
        }
        job.status = 'completed';
        job.endTime = new Date().toISOString();
        job.logs.push('Training completed successfully.');
        // Create a new model version
        const model = this.models.get(job.modelId);
        if (model) {
            const versionId = (0, uuid_1.v4)();
            const version = {
                id: versionId,
                modelId: job.modelId,
                version: `v${model.versions.length + 1}.0.0`,
                status: 'ready',
                metrics: {
                    accuracy: 0.8 + Math.random() * 0.15,
                    precision: 0.8 + Math.random() * 0.15,
                    recall: 0.8 + Math.random() * 0.15,
                    f1: 0.8 + Math.random() * 0.15,
                    loss: 0.2 * Math.random(),
                },
                hyperparameters,
                datasetId: job.datasetId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            model.versions.push(version);
            // Auto-deploy if it's the best model (heuristic)
            if (!model.defaultVersionId || (version.metrics.f1 || 0) > (this.getVersion(model.id, model.defaultVersionId)?.metrics.f1 || 0)) {
                model.defaultVersionId = versionId;
                version.status = 'deployed';
                job.logs.push(`New version ${version.version} deployed as default.`);
            }
            this.saveState();
        }
    }
    getVersion(modelId, versionId) {
        const model = this.models.get(modelId);
        return model?.versions.find(v => v.id === versionId);
    }
    /**
     * Get job status
     */
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    /**
     * Run A/B test between two model versions
     */
    async runABTest(modelId, versionAId, versionBId, durationSeconds = 5) {
        // Simulate A/B test results
        const model = this.models.get(modelId);
        if (!model)
            throw new Error('Model not found');
        const verA = model.versions.find(v => v.id === versionAId);
        const verB = model.versions.find(v => v.id === versionBId);
        if (!verA || !verB)
            throw new Error('Versions not found');
        return {
            experimentId: (0, uuid_1.v4)(),
            status: 'completed',
            results: {
                versionA: {
                    id: versionAId,
                    version: verA.version,
                    requests: 1000,
                    avgLatency: 50 + Math.random() * 20,
                    errorRate: Math.random() * 0.01,
                },
                versionB: {
                    id: versionBId,
                    version: verB.version,
                    requests: 1000,
                    avgLatency: 45 + Math.random() * 20, // Maybe newer is faster?
                    errorRate: Math.random() * 0.01,
                },
                winner: Math.random() > 0.5 ? 'versionA' : 'versionB',
            }
        };
    }
}
exports.AutoMLService = AutoMLService;
exports.autoMLService = new AutoMLService();
