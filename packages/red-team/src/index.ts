/**
 * Red Team Simulation Package
 *
 * Comprehensive red team capabilities including:
 * - MITRE ATT&CK technique library
 * - Attack scenario generation
 * - Social engineering simulation
 * - Attack surface mapping
 * - Campaign management
 */

// Types
export * from './types';

// MITRE ATT&CK
export { MITRELibrary, ScenarioGenerator } from './mitre/mitre-library';

// Social Engineering
export { SocialEngineeringEngine } from './social/social-engineering';

// Reconnaissance
export { AttackSurfaceMapper } from './recon/attack-surface';
