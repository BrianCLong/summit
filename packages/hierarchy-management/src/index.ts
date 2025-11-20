/**
 * Summit Hierarchy Management Package
 * Hierarchical data management for organizational and product structures
 */

export * from './builder/hierarchy-builder.js';

// Re-export types
export type {
  Hierarchy,
  HierarchyNode,
  HierarchyType,
  HierarchyStatus
} from '@summit/mdm-core';
