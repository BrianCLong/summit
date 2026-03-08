"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ajv = exports.configSchema = exports.compatibilitySchema = exports.manifestSchema = void 0;
exports.validateManifest = validateManifest;
exports.validateCompatibility = validateCompatibility;
exports.validateConfigSchema = validateConfigSchema;
exports.formatValidationErrors = formatValidationErrors;
// @ts-nocheck
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const types_js_1 = require("./types.js");
const compatibility_schema_json_1 = __importDefault(require("./schemas/compatibility.schema.json"));
exports.compatibilitySchema = compatibility_schema_json_1.default;
const config_schema_json_1 = __importDefault(require("./schemas/config.schema.json"));
exports.configSchema = config_schema_json_1.default;
const manifest_schema_json_1 = __importDefault(require("./schemas/manifest.schema.json"));
exports.manifestSchema = manifest_schema_json_1.default;
const ajv = new ajv_1.default({
    allErrors: true,
    strict: false,
    validateSchema: false,
});
exports.ajv = ajv;
(0, ajv_formats_1.default)(ajv);
ajv.addSchema(compatibility_schema_json_1.default);
ajv.addSchema(config_schema_json_1.default);
ajv.addSchema(manifest_schema_json_1.default);
const manifestValidator = ajv.getSchema(manifest_schema_json_1.default.$id ?? 'manifest');
const compatibilityValidator = ajv.getSchema(compatibility_schema_json_1.default.$id ?? 'compatibility');
function validateManifest(manifest) {
    if (!manifestValidator(manifest)) {
        throw new types_js_1.BundleValidationError(formatValidationErrors('manifest', manifestValidator.errors));
    }
}
function validateCompatibility(compatibility) {
    if (!compatibilityValidator(compatibility)) {
        throw new types_js_1.BundleValidationError(formatValidationErrors('compatibility matrix', compatibilityValidator.errors));
    }
}
function validateConfigSchema(schema) {
    const valid = ajv.validateSchema(schema);
    if (!valid) {
        throw new types_js_1.BundleValidationError(formatValidationErrors('config schema', ajv.errors));
    }
}
function formatValidationErrors(label, errors) {
    if (!errors || errors.length === 0) {
        return `${label} validation failed with unknown error`;
    }
    const details = errors
        .map((err) => {
        const path = err.instancePath || err.schemaPath;
        const message = err.message ?? 'is invalid';
        return `${path}: ${message}`;
    })
        .join('; ');
    return `${label} validation failed: ${details}`;
}
