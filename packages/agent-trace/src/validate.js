"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTraceRecord = validateTraceRecord;
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const __dirname = (0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url));
const schemaPath = (0, path_1.join)(__dirname, '../schemas/agent_trace_record.schema.json');
const schema = JSON.parse((0, fs_1.readFileSync)(schemaPath, 'utf8'));
const ajv = new _2020_js_1.default({ allErrors: true });
(0, ajv_formats_1.default)(ajv);
const validate = ajv.compile(schema);
function validateTraceRecord(record) {
    const valid = validate(record);
    if (!valid) {
        return {
            valid: false,
            errors: validate.errors?.map((err) => `${err.instancePath} ${err.message}`),
        };
    }
    // Additional semantic checks
    const r = record;
    const semanticErrors = [];
    for (const f of r.files) {
        for (const c of f.conversations) {
            if (c.url) {
                if (c.url.includes('?') || c.url.includes('#')) {
                    semanticErrors.push(`file ${f.path}: conversation URL contains query or fragment`);
                }
            }
            for (const rg of c.ranges) {
                if (rg.start_line > rg.end_line) {
                    semanticErrors.push(`file ${f.path}: start_line (${rg.start_line}) > end_line (${rg.end_line})`);
                }
            }
        }
    }
    if (semanticErrors.length > 0) {
        return { valid: false, errors: semanticErrors };
    }
    return { valid: true };
}
