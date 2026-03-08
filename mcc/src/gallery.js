"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGalleryDataset = buildGalleryDataset;
exports.writeGalleryDataset = writeGalleryDataset;
const node_fs_1 = require("node:fs");
function buildGalleryDataset(cards) {
    return cards.map((card) => {
        const highestRisk = card.risk.flags.reduce((current, flag) => {
            const levels = ['low', 'medium', 'high'];
            return levels.indexOf(flag.level) > levels.indexOf(current.level)
                ? { level: flag.level, flag }
                : current;
        }, { level: 'low', flag: card.risk.flags[0] });
        return {
            modelId: card.metadata.modelId,
            version: card.metadata.version,
            description: card.description,
            owner: card.metadata.owner,
            riskLevel: highestRisk.level,
            metrics: card.metrics.map((metric) => ({
                name: metric.name,
                value: metric.value,
                unit: metric.unit,
            })),
            intendedUse: card.intendedUse.supportedPurposes,
        };
    });
}
function writeGalleryDataset(outputPath, cards) {
    const dataset = buildGalleryDataset(cards);
    (0, node_fs_1.writeFileSync)(outputPath, JSON.stringify(dataset, null, 2), 'utf8');
}
