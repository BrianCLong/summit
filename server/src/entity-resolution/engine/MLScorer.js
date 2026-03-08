"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLScorer = void 0;
const FeatureExtractor_js_1 = require("../models/FeatureExtractor.js");
const SimilarityModel_js_1 = require("../models/SimilarityModel.js");
class MLScorer {
    model;
    constructor(model) {
        this.model = model || new SimilarityModel_js_1.WeightedRuleBasedModel();
    }
    async score(entityA, entityB) {
        const features = FeatureExtractor_js_1.FeatureExtractor.extract(entityA, entityB);
        return this.model.predict(features);
    }
}
exports.MLScorer = MLScorer;
