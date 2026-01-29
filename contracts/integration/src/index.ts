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

// Re-export v1 contracts
export * from './v1/index.js'

// Package metadata
export const CONTRACT_VERSION = '1.0.0'
export const SUPPORTED_API_VERSIONS = ['v1'] as const
