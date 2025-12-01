/**
 * Detection Rules Index
 *
 * Exports all built-in detection rules.
 */

export * from './identity.js';
export * from './network.js';
export * from './endpoint.js';
export * from './cloud.js';

import { identityRules } from './identity.js';
import { networkRules } from './network.js';
import { endpointRules } from './endpoint.js';
import { cloudRules } from './cloud.js';
import type { DetectionRule } from '../engine.js';

/** All built-in detection rules */
export const allRules: DetectionRule[] = [
  ...identityRules,
  ...networkRules,
  ...endpointRules,
  ...cloudRules,
];
