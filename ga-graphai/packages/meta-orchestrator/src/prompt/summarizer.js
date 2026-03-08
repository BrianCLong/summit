"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchicalSummarizer = void 0;
const utils_js_1 = require("./utils.js");
class HierarchicalSummarizer {
    layers;
    tokenEstimator;
    constructor(options) {
        this.layers = options.layers;
        this.tokenEstimator = options.tokenEstimator ?? utils_js_1.defaultTokenEstimator;
    }
    async summarize(text) {
        let working = text;
        const summaries = [];
        for (let index = 0; index < this.layers.length; index += 1) {
            const layer = this.layers[index];
            if (this.tokenEstimator(working) <= layer.maxTokens) {
                summaries.push(working);
                return { layers: summaries, finalSummary: working };
            }
            working = await layer.summarizer(working, index);
            summaries.push(working);
        }
        const finalSummary = summaries.at(-1) ?? working;
        return { layers: summaries, finalSummary };
    }
}
exports.HierarchicalSummarizer = HierarchicalSummarizer;
