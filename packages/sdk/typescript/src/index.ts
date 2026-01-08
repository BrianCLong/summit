/**
 * Summit SDK
 *
 * Official TypeScript SDK for the Summit platform.
 *
 * @example
 * ```typescript
 * import { SummitClient } from '@summit/sdk';
 *
 * const client = new SummitClient({
 *   baseUrl: 'https://api.summit.example.com',
 *   apiKey: process.env.SUMMIT_API_KEY,
 *   tenantId: 'your-tenant-id'
 * });
 *
 * // Evaluate governance
 * const result = await client.governance.evaluate({
 *   action: 'read',
 *   resource: { type: 'document', id: 'doc-123' }
 * });
 *
 * // Get compliance summary
 * const compliance = await client.compliance.getSummary('SOC2');
 * ```
 *
 * @packageDocumentation
 * @module @summit/sdk
 */

export { SummitClient } from "./client.js";
export { GovernanceClient } from "./governance.js";
export { ComplianceClient } from "./compliance.js";
export * from "./types.js";

// Default export
export { SummitClient as default } from "./client.js";
