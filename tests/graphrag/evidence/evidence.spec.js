"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../../packages/intelgraph/graphrag/src/index.js");
const fs_1 = require("fs");
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv = new _2020_js_1.default({ allErrors: true });
(0, ajv_formats_1.default)(ajv);
const indexSchema = JSON.parse((0, fs_1.readFileSync)('packages/intelgraph/graphrag/src/evidence/schemas/index.schema.json', 'utf-8'));
const validate = ajv.compile(indexSchema);
describe('Evidence System', () => {
    it('should build a valid evidence index', () => {
        const entries = [
            {
                evidence_id: 'EVD-INFOWAR-NARR-001',
                files: ['evidence/report.json', 'evidence/metrics.json', 'evidence/stamp.json'],
            },
        ];
        const index = (0, index_js_1.buildEvidenceIndex)(entries);
        expect(index.version).toBe('1.0');
        expect(index.item_slug).toBe('INFOWAR');
        expect(index.entries).toHaveLength(1);
        const isValid = validate(index);
        expect(isValid).toBe(true);
    });
});
