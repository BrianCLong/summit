/**
 * SIGINT Telemetry Schemas
 *
 * Defines normalized event schemas for defensive telemetry collection.
 * All schemas are Zod-based for runtime validation and TypeScript inference.
 *
 * IMPORTANT: This is a SIMULATION-ONLY system using synthetic data.
 * No real-world targeting or sensitive data collection.
 */

export * from './base.js';
export * from './network.js';
export * from './identity.js';
export * from './endpoint.js';
export * from './cloud.js';
