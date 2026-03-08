"use strict";
/**
 * @summit/integration-contracts
 *
 * Unified integration contracts for the Summit critical path.
 * Provides versioned schemas and validators for cross-service communication.
 *
 * Services:
 * - IntelGraph (IG-101): Canonical graph model
 * - Maestro Conductor (MC-205): Orchestration
 * - CompanyOS (CO-58): Product-facing API
 * - Switchboard (SB-33): Ingestion/routing
 *
 * @example
 * ```typescript
 * import { PersonEntityV1, IngestPersonRequestV1 } from '@summit/integration-contracts/v1'
 *
 * const person: PersonEntityV1 = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   type: 'Person',
 *   version: 'v1',
 *   attributes: { name: 'Alice Smith', email: 'alice@example.com' },
 *   metadata: { ... }
 * }
 *
 * // Validate at runtime
 * const validated = PersonEntityV1.parse(person)
 * ```
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
exports.SUPPORTED_API_VERSIONS = exports.CONTRACT_VERSION = void 0;
// Re-export v1 contracts
__exportStar(require("./v1/index.js"), exports);
// Package metadata
exports.CONTRACT_VERSION = '1.0.0';
exports.SUPPORTED_API_VERSIONS = ['v1'];
