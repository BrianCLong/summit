"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentStore = void 0;
const crypto_1 = require("crypto");
const power_js_1 = require("./power.js");
class ExperimentStore {
    experiments = new Map();
    createExperiment(payload, actor) {
        const id = (0, crypto_1.randomUUID)();
        const powerAnalysis = (0, power_js_1.buildPowerAnalysis)(payload.metrics, payload.analysisPlan);
        const experiment = {
            id,
            name: payload.name,
            hypothesis: payload.hypothesis,
            metrics: payload.metrics,
            stopRule: payload.stopRule,
            analysisPlan: payload.analysisPlan,
            status: 'registered',
            createdAt: new Date().toISOString(),
            powerAnalysis,
            auditLog: [],
            exports: [],
            results: {}
        };
        this.experiments.set(id, experiment);
        this.appendAudit(id, {
            actor,
            action: 'CREATE_EXPERIMENT',
            detail: 'Experiment preregistered with locked plan.',
            status: 'SUCCESS'
        });
        return experiment;
    }
    getExperiment(id) {
        return this.experiments.get(id);
    }
    listExperiments() {
        return Array.from(this.experiments.values());
    }
    startExperiment(id, actor) {
        const experiment = this.requireExperiment(id);
        if (experiment.status === 'running') {
            return experiment;
        }
        experiment.status = 'running';
        experiment.lockedAt = new Date().toISOString();
        this.appendAudit(id, {
            actor,
            action: 'START_EXPERIMENT',
            detail: 'Experiment marked as running and analysis plan locked.',
            status: 'SUCCESS'
        });
        return experiment;
    }
    attemptHypothesisUpdate(id, newHypothesis, actor) {
        const experiment = this.requireExperiment(id);
        if (experiment.status === 'running' || experiment.lockedAt) {
            this.appendAudit(id, {
                actor,
                action: 'UPDATE_HYPOTHESIS',
                detail: 'Rejected: hypotheses cannot change once the test is running.',
                status: 'REJECTED'
            });
            throw new Error('Hypothesis changes are locked once the experiment has started.');
        }
        experiment.hypothesis = newHypothesis;
        this.appendAudit(id, {
            actor,
            action: 'UPDATE_HYPOTHESIS',
            detail: 'Hypothesis updated prior to lock.',
            status: 'SUCCESS'
        });
        return newHypothesis;
    }
    appendAudit(id, entry) {
        const experiment = this.requireExperiment(id);
        const fullEntry = {
            ...entry,
            at: new Date().toISOString()
        };
        experiment.auditLog.push(fullEntry);
        return fullEntry;
    }
    recordExport(id, record) {
        const experiment = this.requireExperiment(id);
        const exportEntry = {
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date().toISOString(),
            ...record
        };
        experiment.exports.push(exportEntry);
        return experiment;
    }
    addResult(id, metric, result, actor) {
        const experiment = this.requireExperiment(id);
        const metricRegistered = experiment.metrics.some((m) => m.name === metric);
        if (!metricRegistered) {
            this.appendAudit(id, {
                actor,
                action: 'INGEST_RESULT',
                detail: `Rejected metric ${metric}: not pre-registered.`,
                status: 'REJECTED'
            });
            throw new Error(`Metric ${metric} is not registered for this experiment.`);
        }
        if (!experiment.results[metric]) {
            experiment.results[metric] = [];
        }
        experiment.results[metric].push(result);
        this.appendAudit(id, {
            actor,
            action: 'INGEST_RESULT',
            detail: `Recorded result for metric ${metric}.`,
            status: 'SUCCESS'
        });
        return experiment;
    }
    getPowerAnalysis(id) {
        return this.requireExperiment(id).powerAnalysis;
    }
    requireExperiment(id) {
        const experiment = this.experiments.get(id);
        if (!experiment) {
            throw new Error('Experiment not found');
        }
        return experiment;
    }
}
exports.ExperimentStore = ExperimentStore;
