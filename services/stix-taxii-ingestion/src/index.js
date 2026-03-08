"use strict";
/**
 * STIX 2.1 / TAXII 2.1 Feed Ingestion Service
 *
 * A comprehensive ingestion service for threat intelligence feeds with support for:
 * - STIX 2.1 object parsing and validation
 * - TAXII 2.1 client with proxy support for air-gapped environments
 * - pgvector storage for semantic IOC search
 * - Neo4j graph storage for threat actor relationship analysis
 * - AI-powered enrichment with embedding generation
 *
 * @packageDocumentation
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
// Client
__exportStar(require("./client/index.js"), exports);
// Storage
__exportStar(require("./storage/index.js"), exports);
// Enrichment
__exportStar(require("./enrichment/index.js"), exports);
// Services
__exportStar(require("./services/index.js"), exports);
// Version
exports.VERSION = '1.0.0';
