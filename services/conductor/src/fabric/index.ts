import { CapabilityRegistry } from './registry';

export * from './registry';
export * from './policyRouter';
export * from './evaluators';
export * from './fallbacks';
export * from './modes';

export const capabilityRegistry = new CapabilityRegistry();
