/**
 * Integration Contracts v1
 * Unified contracts for Summit critical path (IG-101, MC-205, CO-58, SB-33)
 */

// Provenance & Metadata
export * from './provenance.js'

// Entities
export * from './entities.js'

// Edges
export * from './edges.js'

// Ingestion (Switchboard → IntelGraph)
export * from './ingestion.js'

// Queries (IntelGraph API)
export * from './queries.js'

// Workflows (Maestro Conductor)
export * from './workflows.js'

// Insights (CompanyOS API)
export * from './insights.js'
