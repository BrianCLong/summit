"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assembleExportBundle = assembleExportBundle;
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function scrubValue(value, rules, meta, path) {
    if (Array.isArray(value)) {
        return value.map((entry, idx) => scrubValue(entry, rules, meta, `${path}[${idx}]`));
    }
    if (value && typeof value === 'object') {
        const next = {};
        for (const [key, val] of Object.entries(value)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (rules.redactFields?.includes(key) || rules.redactFields?.includes(currentPath)) {
                meta.redacted.add(currentPath);
                continue;
            }
            if (rules.maskFields?.includes(key) || rules.maskFields?.includes(currentPath)) {
                meta.masked.add(currentPath);
                next[key] = '[REDACTED]';
                continue;
            }
            next[key] = scrubValue(val, rules, meta, currentPath);
        }
        return next;
    }
    return value;
}
function applyRedaction(records, rules) {
    const allowed = rules.allowReceiptIds && rules.allowReceiptIds.length > 0
        ? records.filter((r) => rules.allowReceiptIds?.includes(r.id))
        : records;
    const droppedReceipts = rules.allowReceiptIds && rules.allowReceiptIds.length > 0
        ? records
            .filter((r) => !rules.allowReceiptIds?.includes(r.id))
            .map((r) => r.id)
        : [];
    const redacted = new Set();
    const masked = new Set();
    const cleaned = allowed.map((record) => scrubValue(clone(record), rules, { redacted, masked }, ''));
    const metadata = {
        applied: droppedReceipts.length > 0 ||
            redacted.size > 0 ||
            masked.size > 0,
        droppedReceipts,
        redactedFields: Array.from(redacted).sort(),
        maskedFields: Array.from(masked).sort(),
    };
    return { data: cleaned, metadata };
}
function assembleExportBundle(input) {
    const receipts = input.receipts ?? [];
    const policyDecisions = input.policyDecisions ?? [];
    const rules = input.redaction ?? {};
    const receiptResult = applyRedaction(receipts, rules);
    const policyResult = applyRedaction(policyDecisions, {
        ...rules,
        allowReceiptIds: undefined,
    });
    const redaction = {
        applied: receiptResult.metadata.applied || policyResult.metadata.applied,
        droppedReceipts: receiptResult.metadata.droppedReceipts,
        redactedFields: Array.from(new Set([
            ...receiptResult.metadata.redactedFields,
            ...policyResult.metadata.redactedFields,
        ])).sort(),
        maskedFields: Array.from(new Set([
            ...receiptResult.metadata.maskedFields,
            ...policyResult.metadata.maskedFields,
        ])).sort(),
    };
    const metadata = {
        redaction,
        counts: {
            receipts: receiptResult.data.length,
            policyDecisions: policyResult.data.length,
        },
    };
    const manifest = {
        ...input.manifest,
        export: {
            generatedAt: new Date().toISOString(),
            receipts: metadata.counts.receipts,
            policyDecisions: metadata.counts.policyDecisions,
            redaction,
        },
    };
    const pack = tar_stream_1.default.pack();
    pack.entry({ name: 'manifest.json' }, JSON.stringify(manifest, null, 2));
    pack.entry({ name: 'receipts.json' }, JSON.stringify(receiptResult.data, null, 2));
    pack.entry({ name: 'policy-decisions.json' }, JSON.stringify(policyResult.data, null, 2));
    pack.entry({ name: 'metadata.json' }, JSON.stringify(metadata, null, 2));
    if (input.attachments) {
        for (const [name, content] of Object.entries(input.attachments)) {
            pack.entry({ name }, JSON.stringify(content, null, 2));
        }
    }
    pack.finalize();
    const gzip = (0, zlib_1.createGzip)();
    pack.pipe(gzip);
    return { stream: gzip, metadata, manifest };
}
