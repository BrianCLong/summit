"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeEvidenceArtifacts = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const DEFAULT_INDEX = {
    version: 1,
    items: [],
};
const sortValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
        return Object.fromEntries(entries.map(([key, nested]) => [key, sortValue(nested)]));
    }
    return value;
};
const serialize = (value) => `${JSON.stringify(sortValue(value), null, 2)}\n`;
const loadIndex = async (indexPath) => {
    try {
        const raw = await (0, promises_1.readFile)(indexPath, 'utf8');
        return JSON.parse(raw);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return { ...DEFAULT_INDEX };
        }
        throw error;
    }
};
const writeEvidenceArtifacts = async (baseDir, evidenceId, artifacts) => {
    const evidenceDir = (0, path_1.join)(baseDir, evidenceId);
    await (0, promises_1.mkdir)(evidenceDir, { recursive: true });
    await (0, promises_1.writeFile)((0, path_1.join)(evidenceDir, 'report.json'), serialize(artifacts.report));
    await (0, promises_1.writeFile)((0, path_1.join)(evidenceDir, 'metrics.json'), serialize(artifacts.metrics));
    await (0, promises_1.writeFile)((0, path_1.join)(evidenceDir, 'stamp.json'), serialize(artifacts.stamp));
    const indexPath = (0, path_1.join)(baseDir, 'index.json');
    const index = await loadIndex(indexPath);
    const entryPath = `${evidenceId}/report.json`;
    const hasEntry = index.items.some((item) => item.id === evidenceId);
    if (!hasEntry) {
        index.items.push({ id: evidenceId, path: entryPath });
        index.items.sort((left, right) => left.id.localeCompare(right.id));
        await (0, promises_1.writeFile)(indexPath, serialize(index));
    }
};
exports.writeEvidenceArtifacts = writeEvidenceArtifacts;
