"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const interpolate_1 = require("./interpolate");
const validatorCache = new Map();
const ajv = new ajv_1.default({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
    messages: true,
    verbose: true,
});
(0, ajv_formats_1.default)(ajv);
function validate(value, schema, options = {}) {
    const validateFn = resolveSchema(schema);
    const diagnostics = [];
    if (!validateFn(value)) {
        if (validateFn.errors) {
            for (const error of validateFn.errors) {
                diagnostics.push(convertAjvError(error, options.pointerMap));
            }
        }
    }
    return diagnostics;
}
function resolveSchema(schema) {
    if (typeof schema === 'string') {
        const absolute = (0, node_path_1.resolve)(schema);
        const cached = validatorCache.get(absolute);
        if (cached) {
            return cached;
        }
        const raw = (0, node_fs_1.readFileSync)(absolute, 'utf8');
        const parsed = JSON.parse(raw);
        const compiled = ajv.compile(parsed);
        validatorCache.set(absolute, compiled);
        return compiled;
    }
    const key = JSON.stringify(schema);
    const cached = validatorCache.get(key);
    if (cached) {
        return cached;
    }
    const compiled = ajv.compile(schema);
    validatorCache.set(key, compiled);
    return compiled;
}
function convertAjvError(error, pointerMap) {
    const pointer = normalizePointer(error.instancePath);
    const position = pointerMap?.[pointer] ??
        pointerMap?.[''] ?? { line: 0, column: 0 };
    const message = error.message ?? 'Schema validation error';
    const code = error.keyword;
    const hint = buildHint(error);
    return {
        severity: 'error',
        message,
        pointer,
        line: position.line,
        column: position.column,
        code,
        hint,
    };
}
function buildHint(error) {
    switch (error.keyword) {
        case 'enum':
            if (Array.isArray(error.params?.allowedValues)) {
                return `Allowed values: ${error.params.allowedValues.join(', ')}`;
            }
            break;
        case 'required':
            if (typeof error.params?.missingProperty === 'string') {
                return `Missing required property: ${error.params.missingProperty}`;
            }
            break;
        case 'type':
            if (typeof error.params?.type === 'string') {
                return `Expected type ${error.params.type}.`;
            }
            break;
        default:
            break;
    }
    return undefined;
}
function normalizePointer(pointer) {
    if (!pointer) {
        return '';
    }
    const segments = pointer
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
        .map((segment) => `/${(0, interpolate_1.escapeJsonPointerSegment)(segment)}`);
    return segments.join('');
}
