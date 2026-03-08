"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
exports.writeEvidence = writeEvidence;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function stableStringify(x) {
    // Simple deterministic stringify: sort keys
    return JSON.stringify(x, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((acc, k) => {
                // @ts-ignore
                acc[k] = value[k];
                return acc;
            }, {});
        }
        return value;
    }, 2) + "\n";
}
function writeEvidence(baseDir, slug, report, metrics, stamp) {
    const dir = path_1.default.join(baseDir, slug);
    fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(dir, 'report.json'), stableStringify(report));
    fs_1.default.writeFileSync(path_1.default.join(dir, 'metrics.json'), stableStringify(metrics));
    fs_1.default.writeFileSync(path_1.default.join(dir, 'stamp.json'), stableStringify(stamp));
    console.log(`Evidence written to ${dir}`);
}
