"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UncertaintySensorRunner = exports.DiverseAgentEntropySensor = exports.EvidenceSparsitySensor = exports.DisagreementSensor = void 0;
const registry_js_1 = require("./registry.js");
class DisagreementSensor {
    threshold;
    constructor(threshold = 0.3) {
        this.threshold = threshold;
    }
    computeSimilarity(answers) {
        if (!answers || answers.length === 0)
            return 0.0;
        const uniqueAnswers = new Set(answers);
        return answers.length > 1 ? 1.0 - uniqueAnswers.size / answers.length : 1.0;
    }
    run(entityRef, data, registry) {
        const answers = data.answers;
        if (!answers || answers.length === 0)
            return;
        const similarity = this.computeSimilarity(answers);
        const disagreement_index = 1.0 - similarity;
        if (disagreement_index > this.threshold) {
            const records = registry.findByEntity(entityRef);
            if (records.length > 0) {
                for (const record of records) {
                    registry.updateRecord(record.id, { disagreement_index }, 'Characterized');
                }
            }
            else {
                registry.createRecord(entityRef, { disagreement_index }, { category: 'model-disagreement' });
            }
        }
    }
}
exports.DisagreementSensor = DisagreementSensor;
class EvidenceSparsitySensor {
    threshold;
    constructor(threshold = 0.5) {
        this.threshold = threshold;
    }
    run(entityRef, data, registry) {
        const supportingEvidence = data.supporting_evidence || [];
        const requiredEvidence = data.required_evidence || 1;
        const evidence_coverage = requiredEvidence <= 0 ? 1.0 : Math.min(1.0, supportingEvidence.length / requiredEvidence);
        if (evidence_coverage < this.threshold) {
            const records = registry.findByEntity(entityRef);
            if (records.length > 0) {
                for (const record of records) {
                    registry.updateRecord(record.id, { evidence_coverage }, 'Characterized');
                }
            }
            else {
                registry.createRecord(entityRef, { evidence_coverage }, { category: 'data-quality' });
            }
        }
    }
}
exports.EvidenceSparsitySensor = EvidenceSparsitySensor;
class DiverseAgentEntropySensor {
    threshold;
    constructor(threshold = 0.6) {
        this.threshold = threshold;
    }
    computeEntropy(probabilities) {
        let entropy = 0.0;
        for (const p of probabilities) {
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        const maxEntropy = probabilities.length > 1 ? Math.log2(probabilities.length) : 1.0;
        return maxEntropy > 0 ? entropy / maxEntropy : 0.0;
    }
    run(entityRef, data, registry) {
        const probabilities = data.probabilities;
        if (!probabilities || probabilities.length === 0)
            return;
        const epistemic_score = this.computeEntropy(probabilities);
        if (epistemic_score > this.threshold) {
            const records = registry.findByEntity(entityRef);
            if (records.length > 0) {
                for (const record of records) {
                    registry.updateRecord(record.id, { epistemic_score }, 'Characterized');
                }
            }
            else {
                registry.createRecord(entityRef, { epistemic_score }, { category: 'model-knowledge' });
            }
        }
    }
}
exports.DiverseAgentEntropySensor = DiverseAgentEntropySensor;
class UncertaintySensorRunner {
    sensors;
    constructor(sensors) {
        this.sensors = sensors || [
            new DisagreementSensor(),
            new EvidenceSparsitySensor(),
            new DiverseAgentEntropySensor(),
        ];
    }
    addSensor(sensor) {
        this.sensors.push(sensor);
    }
    runAll(entityRef, data, registry = registry_js_1.globalRegistry) {
        for (const sensor of this.sensors) {
            try {
                sensor.run(entityRef, data, registry);
            }
            catch (e) {
                console.error(`Sensor failed:`, e);
            }
        }
    }
}
exports.UncertaintySensorRunner = UncertaintySensorRunner;
