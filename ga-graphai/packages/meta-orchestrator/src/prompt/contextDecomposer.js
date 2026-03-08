"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextAwareDecomposer = void 0;
const utils_js_1 = require("./utils.js");
const DEFAULT_THRESHOLD = 0.6;
class ContextAwareDecomposer {
    embed;
    tokenEstimator;
    adaptiveThreshold;
    maxSegments;
    threshold;
    constructor(options) {
        this.embed = options.embed;
        this.tokenEstimator = options.tokenEstimator ?? utils_js_1.defaultTokenEstimator;
        this.adaptiveThreshold = options.adaptiveThreshold ?? false;
        this.threshold = options.saliencyThreshold ?? DEFAULT_THRESHOLD;
        this.maxSegments = options.maxSegments;
    }
    async decompose(task, segments) {
        const taskVector = await this.embed(task);
        const scored = [];
        for (const segment of segments) {
            const vector = await this.embed(segment.text);
            const saliency = (0, utils_js_1.clampValue)((0, utils_js_1.cosineSimilarity)(taskVector, vector), 0, 1);
            scored.push({ ...segment, saliency });
        }
        let workingThreshold = this.threshold;
        if (this.adaptiveThreshold && scored.length > 0) {
            const average = scored.reduce((acc, segment) => acc + segment.saliency, 0) / scored.length;
            workingThreshold = (0, utils_js_1.clampValue)((average + workingThreshold) / 2);
        }
        const selected = scored
            .filter(segment => segment.saliency >= workingThreshold)
            .sort((a, b) => b.saliency - a.saliency)
            .slice(0, this.maxSegments ?? scored.length);
        const discarded = scored.filter(segment => !selected.includes(segment));
        const tokenEstimate = selected.reduce((acc, segment) => acc + this.tokenEstimator(segment.text), 0);
        this.threshold = workingThreshold;
        return { selected, discarded, threshold: workingThreshold, tokenEstimate };
    }
}
exports.ContextAwareDecomposer = ContextAwareDecomposer;
