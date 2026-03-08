"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEvidenceDir = verifyEvidenceDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv = new _2020_1.default({ allErrors: true, strict: false });
(0, ajv_formats_1.default)(ajv);
function verifyEvidenceDir(dirPath) {
    const errors = [];
    const requiredFiles = ['report.json', 'metrics.json', 'stamp.json'];
    for (const file of requiredFiles) {
        const filePath = path_1.default.join(dirPath, file);
        if (!fs_1.default.existsSync(filePath)) {
            errors.push(`Missing required file: ${file}`);
            continue;
        }
        try {
            const content = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
            const schemaName = `swarm_${file.replace('.json', '.schema.json')}`;
            const schemaPath = path_1.default.join(process.cwd(), 'evidence/schemas', schemaName);
            if (fs_1.default.existsSync(schemaPath)) {
                const schema = JSON.parse(fs_1.default.readFileSync(schemaPath, 'utf-8'));
                const validate = ajv.compile(schema);
                if (!validate(content)) {
                    errors.push(`Schema validation failed for ${file}: ${ajv.errorsText(validate.errors)}`);
                }
            }
            if (file !== 'stamp.json') {
                const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
                const stringified = JSON.stringify(content);
                if (timestampRegex.test(stringified)) {
                    errors.push(`Timestamp-like field found in ${file}. Timestamps are only allowed in stamp.json.`);
                }
            }
        }
        catch (e) {
            errors.push(`Failed to verify ${file}: ${e}`);
        }
    }
    return { ok: errors.length === 0, errors };
}
