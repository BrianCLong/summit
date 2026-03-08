"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExport = void 0;
exports.uuidV5ForPath = uuidV5ForPath;
const jszip_1 = __importDefault(require("jszip"));
const json_stable_stringify_1 = __importDefault(require("json-stable-stringify"));
const crypto_1 = require("crypto");
const redact_1 = require("./redact");
const pdf_1 = require("./pdf");
const utils_1 = require("./utils");
const cost_events_1 = require("../../finops/cost-events");
const uuid_1 = require("uuid");
const URL_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
const fixedDate = new Date('2000-01-01T00:00:00Z');
const namespaceBytes = Buffer.from(URL_NAMESPACE.replace(/-/g, ''), 'hex');
function uuidV5ForPath(path) {
    const hash = (0, crypto_1.createHash)('sha1');
    hash.update(namespaceBytes);
    hash.update(path);
    const digest = hash.digest();
    if (digest.length < 16) {
        throw new Error('Unable to generate UUID digest');
    }
    const bytes = Buffer.from(digest.subarray(0, 16));
    const byte6 = bytes[6] ?? 0;
    const byte8 = bytes[8] ?? 0;
    bytes[6] = (byte6 & 0x0f) | 0x50;
    bytes[8] = (byte8 & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const toCsv = (data) => {
    if (data.length === 0)
        return '';
    const headers = Array.from(new Set(data.flatMap((d) => Object.keys(d)))).sort();
    const escape = (val) => {
        const str = val == null ? '' : String(val);
        if (/[",\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const rows = data
        .map((row) => headers.map((h) => escape(row[h])))
        .map((r) => r.join(','));
    return [headers.join(','), ...rows].join('\n');
};
const createExport = async (req) => {
    const startTime = Date.now();
    const correlationId = req.correlationId || (0, uuid_1.v4)();
    const files = [];
    const redactionLog = [];
    const entities = (0, redact_1.applyRedactions)(req.entities, req.redactRules, redactionLog);
    const edges = (0, redact_1.applyRedactions)(req.edges, req.redactRules, redactionLog);
    if (req.format.includes('json')) {
        const entStr = (0, json_stable_stringify_1.default)((0, utils_1.sortObject)(entities));
        files.push({ path: 'data/entities.json', content: Buffer.from(entStr) });
        const edgeStr = (0, json_stable_stringify_1.default)((0, utils_1.sortObject)(edges));
        files.push({ path: 'data/edges.json', content: Buffer.from(edgeStr) });
    }
    if (req.format.includes('csv')) {
        const entCsv = toCsv(entities);
        files.push({ path: 'data/entities.csv', content: Buffer.from(entCsv) });
        const edgeCsv = toCsv(edges);
        files.push({ path: 'data/edges.csv', content: Buffer.from(edgeCsv) });
    }
    if (req.format.includes('pdf')) {
        const pdfBuf = await (0, pdf_1.createPdf)(entities.length, edges.length);
        files.push({ path: 'figures/graph.pdf', content: pdfBuf });
    }
    if (redactionLog.length) {
        files.push({
            path: 'redaction.log',
            content: Buffer.from(redactionLog.join('\n')),
        });
    }
    const manifestEntries = files.map((f) => ({
        path: f.path,
        sha256: (0, utils_1.sha256)(f.content),
        uuid: uuidV5ForPath(f.path),
    }));
    const manifest = {
        generatedAt: fixedDate.toISOString(),
        chainOfCustody: [{ event: 'export', timestamp: fixedDate.toISOString() }],
        files: manifestEntries.sort((a, b) => a.path.localeCompare(b.path)),
    };
    const manifestStr = (0, json_stable_stringify_1.default)(manifest);
    files.push({ path: 'manifest.json', content: Buffer.from(manifestStr) });
    const zip = new jszip_1.default();
    for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
        zip.file(f.path, f.content, { date: fixedDate });
    }
    const outputBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
    });
    try {
        const totalBytes = files.reduce((sum, f) => sum + f.content.length, 0);
        (0, cost_events_1.emitCostEvent)({
            operationType: 'export',
            tenantId: req.tenantId || 'unknown',
            scopeId: req.scopeId || 'default',
            correlationId,
            dimensions: {
                io_bytes: totalBytes,
                objects_written: files.length,
                cpu_ms: Date.now() - startTime,
            },
        });
    }
    catch (error) {
        // Non-critical, log and continue
        console.error('Failed to emit cost event for export', { correlationId, error });
    }
    return outputBuffer;
};
exports.createExport = createExport;
