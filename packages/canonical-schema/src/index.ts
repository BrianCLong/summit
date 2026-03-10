/**
 * Canonical Schema Package
 * Exports all canonical types for Summit/IntelGraph
 */

// Core base types
export * from './core/base.js';

// Entity specializations
export * from './entities/person.js';
export * from './entities/organization.js';

// ER types
export * from './er/types.js';

// Epistemology entities
export * from './entities/epistemology/claim.js';
export * from './entities/epistemology/evidence.js';

// Phenomenology entities
export * from './entities/phenomenology/episode.js';
export * from './entities/phenomenology/perspective.js';
export * from './entities/phenomenology/mediation.js';
