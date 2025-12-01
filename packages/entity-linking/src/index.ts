/**
 * @intelgraph/entity-linking
 * Entity extraction, disambiguation, and linking
 */

// NER
export { NamedEntityRecognizer } from './ner/NamedEntityRecognizer.js';
export type { NERConfig } from './ner/NamedEntityRecognizer.js';

// Entity Linking
export { EntityLinker } from './linking/EntityLinker.js';
export type { EntityCandidate } from './linking/EntityLinker.js';
