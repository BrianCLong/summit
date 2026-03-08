"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const validation_js_1 = require("../utils/validation.js");
(0, globals_1.describe)('Validation utilities', () => {
    (0, globals_1.describe)('validateConfidenceScore', () => {
        (0, globals_1.it)('should accept valid confidence scores', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateConfidenceScore)(0.0)).not.toThrow();
            (0, globals_1.expect)(() => (0, validation_js_1.validateConfidenceScore)(0.5)).not.toThrow();
            (0, globals_1.expect)(() => (0, validation_js_1.validateConfidenceScore)(1.0)).not.toThrow();
        });
        (0, globals_1.it)('should reject confidence scores out of range', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateConfidenceScore)(-0.1)).toThrow(validation_js_1.ValidationError);
            (0, globals_1.expect)(() => (0, validation_js_1.validateConfidenceScore)(1.1)).toThrow(validation_js_1.ValidationError);
        });
        (0, globals_1.it)('should reject non-number values', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateConfidenceScore)(NaN)).toThrow(validation_js_1.ValidationError);
        });
    });
    (0, globals_1.describe)('validateMediaType', () => {
        (0, globals_1.it)('should accept valid media types', () => {
            (0, globals_1.expect)((0, validation_js_1.validateMediaType)('VIDEO')).toBe(true);
            (0, globals_1.expect)((0, validation_js_1.validateMediaType)('AUDIO')).toBe(true);
            (0, globals_1.expect)((0, validation_js_1.validateMediaType)('IMAGE')).toBe(true);
        });
        (0, globals_1.it)('should reject invalid media types', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateMediaType)('INVALID')).toThrow(validation_js_1.ValidationError);
        });
    });
    (0, globals_1.describe)('validateFileSize', () => {
        (0, globals_1.it)('should accept valid file sizes', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateFileSize)(1000, 'IMAGE')).not.toThrow();
            (0, globals_1.expect)(() => (0, validation_js_1.validateFileSize)(1024000, 'VIDEO')).not.toThrow();
        });
        (0, globals_1.it)('should reject files that are too large', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateFileSize)(3 * 1024 * 1024 * 1024, 'VIDEO')).toThrow(validation_js_1.ValidationError);
        });
        (0, globals_1.it)('should reject zero or negative file sizes', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateFileSize)(0, 'IMAGE')).toThrow(validation_js_1.ValidationError);
            (0, globals_1.expect)(() => (0, validation_js_1.validateFileSize)(-1, 'IMAGE')).toThrow(validation_js_1.ValidationError);
        });
    });
});
