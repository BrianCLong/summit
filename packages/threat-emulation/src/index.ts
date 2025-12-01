/**
 * Threat Emulation Package
 *
 * Comprehensive threat actor emulation including:
 * - APT group TTP libraries
 * - Threat actor profiles
 * - Emulation plan generation
 * - Campaign tracking
 */

// Types
export * from './types';

// APT Library
export { APTLibrary, EmulationPlanGenerator } from './actors/apt-library';
