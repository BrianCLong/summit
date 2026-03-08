"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkScanner = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_perf_hooks_1 = require("node:perf_hooks");
const classifier_js_1 = require("./classifier.js");
const digestDetections = (detections) => detections
    .map((detection) => `${detection.type}:${detection.value}:${detection.severity}:${detection.confidence.toFixed(2)}`)
    .sort()
    .join('|');
const stableStringify = (input) => {
    if (input === null || input === undefined) {
        return 'null';
    }
    if (typeof input === 'string') {
        return input;
    }
    if (typeof input === 'number' || typeof input === 'boolean') {
        return String(input);
    }
    if (Array.isArray(input)) {
        return `[${input.map((value) => stableStringify(value)).join(',')}]`;
    }
    if (typeof input === 'object') {
        const entries = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
        return `{${entries.map(([key, value]) => `${key}:${stableStringify(value)}`).join(',')}}`;
    }
    return '';
};
const fingerprint = (value) => node_crypto_1.default.createHash('sha256').update(stableStringify(value)).digest('hex');
const walkRecord = function* (value, schemaFields, root) {
    const stack = [
        { path: [root], value },
    ];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        const currentValue = current.value;
        const fieldName = current.path[current.path.length - 1];
        const schemaField = schemaFields?.find((field) => field.fieldName === fieldName);
        if (currentValue === null ||
            currentValue === undefined ||
            currentValue === '') {
            continue;
        }
        if (typeof currentValue === 'string' ||
            typeof currentValue === 'number' ||
            typeof currentValue === 'boolean') {
            yield {
                path: current.path,
                value: String(currentValue),
                schemaField,
            };
            continue;
        }
        if (Array.isArray(currentValue)) {
            for (let i = currentValue.length - 1; i >= 0; i -= 1) {
                stack.push({
                    path: [...current.path, String(i)],
                    value: currentValue[i],
                });
            }
            continue;
        }
        if (typeof currentValue === 'object') {
            const entries = Object.entries(currentValue);
            for (let i = entries.length - 1; i >= 0; i -= 1) {
                const [key, nested] = entries[i];
                stack.push({
                    path: [...current.path, key],
                    value: nested,
                });
            }
        }
    }
};
class BulkScanner {
    engine;
    state = new Map();
    constructor(engine) {
        this.engine = engine ?? new classifier_js_1.ClassificationEngine();
    }
    async scan(records, options = {}) {
        const batchSize = options.batchSize ?? 250;
        const batches = [];
        for (let i = 0; i < records.length; i += batchSize) {
            batches.push(records.slice(i, i + batchSize));
        }
        const results = [];
        let newDetections = 0;
        let updatedDetections = 0;
        let unchanged = 0;
        const startTime = node_perf_hooks_1.performance.now();
        for (const batch of batches) {
            for (const record of batch) {
                const scanResult = await this.scanRecord(record, options);
                if (!scanResult.changed && !options.includeUnchanged) {
                    unchanged += 1;
                    continue;
                }
                if (scanResult.changed) {
                    const previous = this.state.get(record.id);
                    if (!previous) {
                        newDetections += 1;
                    }
                    else {
                        updatedDetections += 1;
                    }
                    this.state.set(record.id, {
                        hash: scanResult.currentHash ?? '',
                        detections: scanResult.detected,
                    });
                }
                else {
                    unchanged += 1;
                }
                results.push(scanResult);
            }
        }
        const durationMs = node_perf_hooks_1.performance.now() - startTime;
        return {
            results,
            newDetections,
            updatedDetections,
            unchanged,
            durationMs,
        };
    }
    async scanRecord(record, options = {}) {
        const hash = record.hash ?? fingerprint(record.value);
        const stateEntry = this.state.get(record.id);
        if (options.incremental && stateEntry && stateEntry.hash === hash) {
            return {
                recordId: record.id,
                tableName: record.tableName,
                detected: stateEntry.detections,
                changed: false,
                previousHash: stateEntry.hash,
                currentHash: hash,
            };
        }
        const detections = [];
        const rootPath = record.tableName ?? record.schema?.name ?? 'record';
        for (const field of walkRecord(record.value, record.schema?.fields ?? [], rootPath)) {
            const classification = await this.engine.classify(field.value, {
                value: field.value,
                schema: record.schema,
                schemaField: field.schemaField,
                recordId: record.id,
                tableName: record.tableName,
                additionalContext: {
                    path: field.path.join('.'),
                    updatedAt: record.updatedAt,
                },
            }, options);
            for (const entity of classification.entities) {
                detections.push({
                    ...entity,
                    metadata: {
                        ...entity.metadata,
                        fieldPath: field.path,
                        recordId: record.id,
                    },
                });
            }
        }
        const digest = digestDetections(detections);
        const previous = this.state.get(record.id);
        const previousDigest = previous
            ? digestDetections(previous.detections)
            : undefined;
        const changed = !previous || previous.hash !== hash || previousDigest !== digest;
        return {
            recordId: record.id,
            tableName: record.tableName,
            detected: detections,
            changed,
            previousHash: previous?.hash,
            currentHash: hash,
        };
    }
    clearState() {
        this.state.clear();
    }
}
exports.BulkScanner = BulkScanner;
