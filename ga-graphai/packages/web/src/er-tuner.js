"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeThresholdMetrics = computeThresholdMetrics;
exports.buildThresholdReport = buildThresholdReport;
function computeThresholdMetrics(scores, threshold) {
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    scores.forEach((record) => {
        if (record.score >= threshold) {
            if (record.isMatch) {
                truePositives += 1;
            }
            else {
                falsePositives += 1;
            }
        }
        else if (record.isMatch) {
            falseNegatives += 1;
        }
    });
    const precision = truePositives + falsePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
    const recall = truePositives + falseNegatives === 0 ? 0 : truePositives / (truePositives + falseNegatives);
    return {
        threshold,
        precision: Number(precision.toFixed(3)),
        recall: Number(recall.toFixed(3)),
        truePositives,
        falsePositives,
        falseNegatives,
    };
}
function buildThresholdReport(scores, thresholds) {
    return thresholds.map((threshold) => computeThresholdMetrics(scores, threshold));
}
