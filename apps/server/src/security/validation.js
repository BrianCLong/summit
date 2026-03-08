"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndSanitizeDropInput = void 0;
const validator_1 = __importDefault(require("validator"));
const securityLogger_js_1 = require("../observability/securityLogger.js");
const MAX_PAYLOAD_BYTES = 1024 * 1024 * 5; // 5MB
const validateAndSanitizeDropInput = (input) => {
    if (!input || typeof input.payload !== 'string') {
        securityLogger_js_1.securityLogger.logEvent('drop_validation_failed', {
            level: 'warn',
            message: 'Payload missing or not a string',
        });
        throw new Error('Invalid payload');
    }
    if (!validator_1.default.isBase64(input.payload, { urlSafe: false })) {
        securityLogger_js_1.securityLogger.logEvent('drop_validation_failed', {
            level: 'warn',
            message: 'Payload is not valid base64',
        });
        throw new Error('Payload must be base64 encoded');
    }
    const decoded = Buffer.from(input.payload, 'base64');
    if (decoded.byteLength > MAX_PAYLOAD_BYTES) {
        securityLogger_js_1.securityLogger.logEvent('drop_validation_failed', {
            level: 'warn',
            message: 'Payload exceeds maximum size',
        });
        throw new Error('Payload size exceeds limit');
    }
    let metadata;
    if (input.metadata) {
        const sanitizedMetadata = validator_1.default.stripLow(input.metadata, true);
        try {
            metadata = JSON.parse(sanitizedMetadata);
        }
        catch (error) {
            securityLogger_js_1.securityLogger.logEvent('drop_validation_failed', {
                level: 'warn',
                message: 'Metadata is not valid JSON',
            });
            throw new Error('Metadata must be valid JSON');
        }
    }
    return {
        payload: decoded,
        metadata,
    };
};
exports.validateAndSanitizeDropInput = validateAndSanitizeDropInput;
