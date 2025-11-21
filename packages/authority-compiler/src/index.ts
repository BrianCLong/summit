/**
 * Authority/License Compiler
 *
 * Runtime enforcement of authority policies for the Summit platform.
 * Integrates with OPA for policy evaluation and prov-ledger for audit trails.
 *
 * @module authority-compiler
 */

export * from './schema/policy.schema';
export * from './compiler';
export * from './evaluator';
export * from './middleware';
