"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const AttachmentService_js_1 = require("../src/services/AttachmentService.js");
const provenance_js_1 = require("./mocks/provenance.js");
const globals_1 = require("@jest/globals");
// Use process.cwd() since tests run from server directory
const TMP_DIR = path.join(process.cwd(), '..', 'tmp-test');
(0, globals_1.describe)('AttachmentService', () => {
    (0, globals_1.it)('stores file and computes sha256', async () => {
        const service = new AttachmentService_js_1.AttachmentService(TMP_DIR);
        const content = 'hello world';
        const stream = stream_1.Readable.from(content);
        const meta = await service.save(stream, {
            filename: 'test.txt',
            mimeType: 'text/plain',
        });
        (0, globals_1.expect)(meta.sha256).toBe((0, crypto_1.createHash)('sha256').update(content).digest('hex'));
    });
    (0, globals_1.it)('detects and redacts PII', () => {
        const text = 'Email test@example.com phone 555-123-4567 ssn 123-45-6789';
        const found = (0, AttachmentService_js_1.detectPII)(text);
        (0, globals_1.expect)(found.emails).toContain('test@example.com');
        (0, globals_1.expect)(found.phones[0]).toBe('555-123-4567');
        (0, globals_1.expect)(found.ssns[0]).toBe('123-45-6789');
        const redacted = (0, AttachmentService_js_1.redactPII)(text);
        (0, globals_1.expect)(redacted).not.toContain('test@example.com');
        (0, globals_1.expect)(redacted).not.toContain('555-123-4567');
        (0, globals_1.expect)(redacted).not.toContain('123-45-6789');
    });
    (0, globals_1.it)('creates deterministic provenance record', () => {
        const timestamp = '2020-01-01T00:00:00.000Z';
        const rec1 = (0, provenance_js_1.createProvenanceRecord)('data', 'SHA-256', '1', timestamp);
        const rec2 = (0, provenance_js_1.createProvenanceRecord)('data', 'SHA-256', '1', timestamp);
        (0, globals_1.expect)(rec1.inputHash).toBe(rec2.inputHash);
        (0, globals_1.expect)(rec1.signature).toBe(rec2.signature);
    });
});
