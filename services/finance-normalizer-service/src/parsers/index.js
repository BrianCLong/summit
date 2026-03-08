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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankApiParser = exports.swiftParser = exports.csvParser = void 0;
exports.getParser = getParser;
exports.detectParser = detectParser;
exports.parseData = parseData;
exports.getSupportedFormats = getSupportedFormats;
const csv_js_1 = require("./csv.js");
const swift_js_1 = require("./swift.js");
const bankApi_js_1 = require("./bankApi.js");
__exportStar(require("./types.js"), exports);
__exportStar(require("./utils.js"), exports);
var csv_js_2 = require("./csv.js");
Object.defineProperty(exports, "csvParser", { enumerable: true, get: function () { return csv_js_2.csvParser; } });
var swift_js_2 = require("./swift.js");
Object.defineProperty(exports, "swiftParser", { enumerable: true, get: function () { return swift_js_2.swiftParser; } });
var bankApi_js_2 = require("./bankApi.js");
Object.defineProperty(exports, "bankApiParser", { enumerable: true, get: function () { return bankApi_js_2.bankApiParser; } });
/**
 * Registry of available parsers
 */
const parserRegistry = new Map([
    ['CSV', csv_js_1.csvParser],
    ['SWIFT_MT940', swift_js_1.swiftParser],
    ['SWIFT_MT942', swift_js_1.swiftParser],
    ['SWIFT_MT103', swift_js_1.swiftParser],
    ['JSON', bankApi_js_1.bankApiParser],
]);
/**
 * Get parser for a specific format
 */
function getParser(format) {
    return parserRegistry.get(format);
}
/**
 * Auto-detect format and return appropriate parser
 */
function detectParser(data) {
    for (const parser of parserRegistry.values()) {
        if (parser.detect(data)) {
            return parser;
        }
    }
    return undefined;
}
/**
 * Parse data with auto-detection or specified format
 */
async function parseData(data, format, config) {
    let parser;
    if (format) {
        parser = getParser(format);
        if (!parser) {
            return {
                records: [],
                errors: [{
                        code: 'UNSUPPORTED_FORMAT',
                        message: `Format '${format}' is not supported`,
                        lineNumber: 0,
                    }],
                totalRecords: 0,
                format,
                config: config || {},
                metadata: {
                    durationMs: 0,
                    parserVersion: '1.0.0',
                },
            };
        }
    }
    else {
        parser = detectParser(data);
        if (!parser) {
            return {
                records: [],
                errors: [{
                        code: 'FORMAT_DETECTION_FAILED',
                        message: 'Could not detect data format',
                        lineNumber: 0,
                    }],
                totalRecords: 0,
                format: 'CUSTOM',
                config: config || {},
                metadata: {
                    durationMs: 0,
                    parserVersion: '1.0.0',
                },
            };
        }
    }
    // Validate config
    if (config) {
        const configErrors = parser.validateConfig(config);
        if (configErrors.length > 0) {
            return {
                records: [],
                errors: configErrors.map((msg, i) => ({
                    code: 'INVALID_CONFIG',
                    message: msg,
                    lineNumber: 0,
                })),
                totalRecords: 0,
                format: parser.format,
                config,
                metadata: {
                    durationMs: 0,
                    parserVersion: '1.0.0',
                },
            };
        }
    }
    return parser.parse(data, config);
}
/**
 * List all supported formats
 */
function getSupportedFormats() {
    return Array.from(parserRegistry.keys());
}
