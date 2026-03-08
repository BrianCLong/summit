"use strict";
/**
 * @intelgraph/document-governance
 *
 * Business Document Ontology and Governance Framework for Summit/IntelGraph/CompanyOS
 *
 * This package provides comprehensive document governance capabilities including:
 * - Document type ontology with 50+ business document types
 * - Lifecycle state management with configurable transitions
 * - Multi-dimensional risk scoring
 * - Compliance validation against SOC2, ISO27001, GDPR, and more
 * - AI provenance tracking for AI-assisted document creation
 * - Relationship management between documents
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
exports.VERSION = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Services
__exportStar(require("./services/index.js"), exports);
// Version
exports.VERSION = '1.0.0';
