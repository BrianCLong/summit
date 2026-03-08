"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimate = estimate;
const translator_js_1 = require("./translator.js");
function estimate(prompt) {
    const translation = (0, translator_js_1.translate)(prompt);
    const complexity = translation.cypher.split(/\bMATCH\b/gi).length - 1;
    const filters = (translation.cypher.match(/WHERE/gi) || []).length;
    const estimatedRows = Math.max(5, 50 - filters * 10 - complexity * 5);
    const estimatedCost = Math.max(1, estimatedRows * (1 + filters * 0.2 + complexity * 0.1));
    return {
        estimatedRows: Math.round(estimatedRows),
        estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
}
