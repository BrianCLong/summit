"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
const ajv = new ajv_1.default({ strict: false });
(0, ajv_formats_1.default)(ajv);
const schemaDir = (0, path_1.join)(__dirname, '../../schema');
const fixturesDir = (0, path_1.join)(__dirname, '../../../../fixtures/factcert');
// Load schemas
const credentialSchema = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(schemaDir, 'credential.schema.json'), 'utf-8'));
const stampSchema = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(schemaDir, 'stamp.schema.json'), 'utf-8'));
// Manually add schemas with simple ID to facilitate referencing
ajv.addSchema(stampSchema, 'stamp.schema.json');
(0, vitest_1.describe)('schemas', () => {
    (0, vitest_1.it)('validates credential fixture', () => {
        const validate = ajv.compile(credentialSchema);
        const fixture = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(fixturesDir, 'credential_example.json'), 'utf-8'));
        const valid = validate(fixture);
        if (!valid)
            console.error(validate.errors);
        (0, vitest_1.expect)(valid).toBe(true);
    });
});
