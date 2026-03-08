"use strict";
/**
 * ETL Assistant
 *
 * Provides schema inference, PII detection, and canonical mapping capabilities.
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
exports.ETLAssistant = exports.CanonicalMapper = exports.PIIDetection = exports.SchemaInference = void 0;
__exportStar(require("./types"), exports);
var schema_inference_1 = require("./schema-inference");
Object.defineProperty(exports, "SchemaInference", { enumerable: true, get: function () { return schema_inference_1.SchemaInference; } });
var pii_detection_1 = require("./pii-detection");
Object.defineProperty(exports, "PIIDetection", { enumerable: true, get: function () { return pii_detection_1.PIIDetection; } });
var canonical_mapper_1 = require("./canonical-mapper");
Object.defineProperty(exports, "CanonicalMapper", { enumerable: true, get: function () { return canonical_mapper_1.CanonicalMapper; } });
// Re-export for convenience
const schema_inference_2 = require("./schema-inference");
const pii_detection_2 = require("./pii-detection");
const canonical_mapper_2 = require("./canonical-mapper");
/**
 * ETL Assistant Facade
 *
 * Provides a unified interface to all ETL capabilities.
 */
class ETLAssistant {
    schemaInference;
    piiDetection;
    canonicalMapper;
    constructor() {
        this.schemaInference = new schema_inference_2.SchemaInference();
        this.piiDetection = new pii_detection_2.PIIDetection();
        this.canonicalMapper = new canonical_mapper_2.CanonicalMapper();
    }
    /**
     * Analyze sample records
     */
    analyze(samples, schemaHint) {
        const schemaResult = this.schemaInference.inferSchema(samples, schemaHint);
        const piiResult = this.piiDetection.detectPII(samples);
        return {
            schema: schemaResult,
            pii: piiResult,
        };
    }
    /**
     * Get schema inference engine
     */
    getSchemaInference() {
        return this.schemaInference;
    }
    /**
     * Get PII detection engine
     */
    getPIIDetection() {
        return this.piiDetection;
    }
    /**
     * Get canonical mapper
     */
    getCanonicalMapper() {
        return this.canonicalMapper;
    }
}
exports.ETLAssistant = ETLAssistant;
