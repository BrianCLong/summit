"use strict";
/**
 * @intelgraph/document-governance - Type Definitions
 *
 * Central export for all document governance type definitions.
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
exports.CreationSourceSchema = exports.AIProvenanceMetadataSchema = exports.RiskScoreSchema = exports.ComplianceCheckResultSchema = exports.TransitionResultSchema = exports.TransitionRequestSchema = exports.LifecycleDefinitionSchema = exports.DocumentRelationshipSchema = exports.RelationshipTypeIdSchema = exports.LifecycleTypeSchema = exports.RiskLevelSchema = exports.ClassificationLevelSchema = exports.DocumentInstanceSchema = exports.DocumentTypeDefinitionSchema = void 0;
// Document types
__exportStar(require("./document.js"), exports);
// Relationship types
__exportStar(require("./relationship.js"), exports);
// Lifecycle types
__exportStar(require("./lifecycle.js"), exports);
// Compliance and risk types
__exportStar(require("./compliance.js"), exports);
// AI provenance types
__exportStar(require("./provenance.js"), exports);
// Re-export commonly used schemas for convenience
var document_js_1 = require("./document.js");
Object.defineProperty(exports, "DocumentTypeDefinitionSchema", { enumerable: true, get: function () { return document_js_1.DocumentTypeDefinitionSchema; } });
Object.defineProperty(exports, "DocumentInstanceSchema", { enumerable: true, get: function () { return document_js_1.DocumentInstanceSchema; } });
Object.defineProperty(exports, "ClassificationLevelSchema", { enumerable: true, get: function () { return document_js_1.ClassificationLevelSchema; } });
Object.defineProperty(exports, "RiskLevelSchema", { enumerable: true, get: function () { return document_js_1.RiskLevelSchema; } });
Object.defineProperty(exports, "LifecycleTypeSchema", { enumerable: true, get: function () { return document_js_1.LifecycleTypeSchema; } });
var relationship_js_1 = require("./relationship.js");
Object.defineProperty(exports, "RelationshipTypeIdSchema", { enumerable: true, get: function () { return relationship_js_1.RelationshipTypeIdSchema; } });
Object.defineProperty(exports, "DocumentRelationshipSchema", { enumerable: true, get: function () { return relationship_js_1.DocumentRelationshipSchema; } });
var lifecycle_js_1 = require("./lifecycle.js");
Object.defineProperty(exports, "LifecycleDefinitionSchema", { enumerable: true, get: function () { return lifecycle_js_1.LifecycleDefinitionSchema; } });
Object.defineProperty(exports, "TransitionRequestSchema", { enumerable: true, get: function () { return lifecycle_js_1.TransitionRequestSchema; } });
Object.defineProperty(exports, "TransitionResultSchema", { enumerable: true, get: function () { return lifecycle_js_1.TransitionResultSchema; } });
var compliance_js_1 = require("./compliance.js");
Object.defineProperty(exports, "ComplianceCheckResultSchema", { enumerable: true, get: function () { return compliance_js_1.ComplianceCheckResultSchema; } });
Object.defineProperty(exports, "RiskScoreSchema", { enumerable: true, get: function () { return compliance_js_1.RiskScoreSchema; } });
var provenance_js_1 = require("./provenance.js");
Object.defineProperty(exports, "AIProvenanceMetadataSchema", { enumerable: true, get: function () { return provenance_js_1.AIProvenanceMetadataSchema; } });
Object.defineProperty(exports, "CreationSourceSchema", { enumerable: true, get: function () { return provenance_js_1.CreationSourceSchema; } });
