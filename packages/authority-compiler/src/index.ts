/**
 * Authority/License Compiler
 *
 * Runtime enforcement of authority policies for the Summit platform.
 * Integrates with OPA for policy evaluation and prov-ledger for audit trails.
 *
 * @module authority-compiler
 */

export * from './schema/policy.schema.js';
export * from './compiler.js';
export * from './evaluator.js';
export * from './middleware.js';
export * from './opa-client.js';
export * from './service-connectors.js';
export * from './provenance-integration.js';
