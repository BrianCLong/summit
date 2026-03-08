"use strict";
/**
 * @intelgraph/platform-data
 *
 * Data utilities for Summit platform.
 * Implements Prompts 36-40: Data Lineage, Mock Data, Privacy
 *
 * Features:
 * - Data lineage tracking and graph visualization
 * - Mock data factory for testing
 * - PII detection and anonymization
 * - Privacy-preserving data transformations
 */
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
exports.anonymizeValue = exports.hashValue = exports.maskEmail = exports.maskValue = exports.detectPII = exports.createAnonymizer = exports.anonymizer = exports.DataAnonymizer = exports.createMockFactory = exports.mockFactory = exports.MockDataFactory = exports.getLineageTracker = exports.LineageTracker = exports.LineageGraph = void 0;
// Lineage exports
__exportStar(require("./lineage/tracker.js"), exports);
// Mock data exports
__exportStar(require("./mock/factory.js"), exports);
// Privacy exports
__exportStar(require("./privacy/anonymizer.js"), exports);
// Re-export commonly used items
var tracker_js_1 = require("./lineage/tracker.js");
Object.defineProperty(exports, "LineageGraph", { enumerable: true, get: function () { return tracker_js_1.LineageGraph; } });
Object.defineProperty(exports, "LineageTracker", { enumerable: true, get: function () { return tracker_js_1.LineageTracker; } });
Object.defineProperty(exports, "getLineageTracker", { enumerable: true, get: function () { return tracker_js_1.getLineageTracker; } });
var factory_js_1 = require("./mock/factory.js");
Object.defineProperty(exports, "MockDataFactory", { enumerable: true, get: function () { return factory_js_1.MockDataFactory; } });
Object.defineProperty(exports, "mockFactory", { enumerable: true, get: function () { return factory_js_1.mockFactory; } });
Object.defineProperty(exports, "createMockFactory", { enumerable: true, get: function () { return factory_js_1.createMockFactory; } });
var anonymizer_js_1 = require("./privacy/anonymizer.js");
Object.defineProperty(exports, "DataAnonymizer", { enumerable: true, get: function () { return anonymizer_js_1.DataAnonymizer; } });
Object.defineProperty(exports, "anonymizer", { enumerable: true, get: function () { return anonymizer_js_1.anonymizer; } });
Object.defineProperty(exports, "createAnonymizer", { enumerable: true, get: function () { return anonymizer_js_1.createAnonymizer; } });
Object.defineProperty(exports, "detectPII", { enumerable: true, get: function () { return anonymizer_js_1.detectPII; } });
Object.defineProperty(exports, "maskValue", { enumerable: true, get: function () { return anonymizer_js_1.maskValue; } });
Object.defineProperty(exports, "maskEmail", { enumerable: true, get: function () { return anonymizer_js_1.maskEmail; } });
Object.defineProperty(exports, "hashValue", { enumerable: true, get: function () { return anonymizer_js_1.hashValue; } });
Object.defineProperty(exports, "anonymizeValue", { enumerable: true, get: function () { return anonymizer_js_1.anonymizeValue; } });
