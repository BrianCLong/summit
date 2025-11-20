/**
 * Hierarchy Manager
 * Manages entity hierarchies and relationships including parent-child structures,
 * organizational hierarchies, and complex relationship graphs.
 */

import { trace } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import type {
  EntityRelationship,
  EntityHierarchy,
  HierarchyNode,
  HierarchyValidation,
  HierarchyRelationType,
  MDMDomain,
  GoldenRecord,
} from '../types.js';

const tracer = trace.getTracer('master-data-mgmt');

/**
 * Configuration for hierarchy manager
 */
export interface HierarchyManagerConfig {
  enableCaching?: boolean;
  cacheTimeout?: number;
  allowDynamicHierarchies?: boolean;
  defaultValidation?: HierarchyValidation;
}

/**
 * Hierarchy path result
 */
export interface HierarchyPath {
  from: string;
  to: string;
  path: string[];
  distance: number;
  relationships: EntityRelationship[];
}

/**
 * Hierarchy statistics
 */
export interface HierarchyStats {
  totalNodes: number;
  totalRelationships: number;
  maxDepth: number;
  leafNodes: number;
  rootNodes: number;
  averageBranchingFactor: number;
}

/**
 * Hierarchy Manager
 * Manages entity hierarchies and relationships
 */
export class HierarchyManager {
  private config: Required<HierarchyManagerConfig>;
  private hierarchyCache: Map<string, EntityHierarchy>;
  private relationshipCache: Map<string, EntityRelationship[]>;

  constructor(config: HierarchyManagerConfig = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      cacheTimeout: config.cacheTimeout ?? 300000, // 5 minutes
      allowDynamicHierarchies: config.allowDynamicHierarchies ?? true,
      defaultValidation: config.defaultValidation ?? {
        allowCycles: false,
        allowMultipleParents: false,
        requireRoot: true,
      },
    };

    this.hierarchyCache = new Map();
    this.relationshipCache = new Map();
  }

  /**
   * Create a new entity relationship
   */
  async createRelationship(
    parentId: string,
    childId: string,
    relationType: HierarchyRelationType,
    domain: MDMDomain,
    attributes?: Record<string, unknown>
  ): Promise<EntityRelationship> {
    return tracer.startActiveSpan(
      'HierarchyManager.createRelationship',
      async (span) => {
        try {
          span.setAttribute('parent.id', parentId);
          span.setAttribute('child.id', childId);
          span.setAttribute('relation.type', relationType);

          const relationship: EntityRelationship = {
            relationshipId: uuidv4(),
            relationType,
            parentId,
            childId,
            domain,
            effectiveDate: new Date(),
            strength: 1.0,
            bidirectional: false,
            attributes,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Clear cache for affected entities
          this.invalidateCache(parentId);
          this.invalidateCache(childId);

          return relationship;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Build hierarchy from relationships
   */
  async buildHierarchy(
    relationships: EntityRelationship[],
    rootEntityId: string,
    domain: MDMDomain,
    name: string,
    validation?: HierarchyValidation
  ): Promise<EntityHierarchy> {
    return tracer.startActiveSpan(
      'HierarchyManager.buildHierarchy',
      async (span) => {
        try {
          span.setAttribute('root.entity.id', rootEntityId);
          span.setAttribute('relationships.count', relationships.length);

          const validationRules = validation ?? this.config.defaultValidation;

          // Validate hierarchy structure
          await this.validateHierarchyStructure(
            relationships,
            rootEntityId,
            validationRules
          );

          // Build hierarchy tree
          const nodes = this.buildHierarchyNodes(
            relationships,
            rootEntityId,
            validationRules
          );

          // Calculate depth
          const depth = Math.max(...nodes.map((n) => n.level), 0);

          const hierarchy: EntityHierarchy = {
            hierarchyId: uuidv4(),
            name,
            domain,
            rootEntityId,
            depth,
            nodes,
            relationType: this.determineRelationType(relationships),
            isActive: true,
            effectiveDate: new Date(),
            metadata: {
              nodeCount: nodes.length,
              leafCount: nodes.filter((n) => n.isLeaf).length,
            },
          };

          // Cache hierarchy
          if (this.config.enableCaching) {
            this.hierarchyCache.set(hierarchy.hierarchyId, hierarchy);
          }

          span.setAttribute('hierarchy.depth', depth);
          span.setAttribute('hierarchy.nodes', nodes.length);

          return hierarchy;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Build hierarchy nodes recursively
   */
  private buildHierarchyNodes(
    relationships: EntityRelationship[],
    rootId: string,
    validation: HierarchyValidation,
    level: number = 0,
    visited: Set<string> = new Set(),
    path: string[] = []
  ): HierarchyNode[] {
    // Check for cycles
    if (!validation.allowCycles && visited.has(rootId)) {
      throw new Error(`Cycle detected at entity ${rootId}`);
    }

    // Check max depth
    if (validation.maxDepth && level > validation.maxDepth) {
      throw new Error(
        `Maximum hierarchy depth ${validation.maxDepth} exceeded`
      );
    }

    visited.add(rootId);
    const currentPath = [...path, rootId];

    // Find children
    const children = relationships
      .filter((r) => r.parentId === rootId)
      .map((r) => r.childId);

    // Create node
    const node: HierarchyNode = {
      entityId: rootId,
      level,
      parentId: path[path.length - 1],
      children,
      path: currentPath,
      isLeaf: children.length === 0,
    };

    // Recursively build child nodes
    const childNodes: HierarchyNode[] = [];
    for (const childId of children) {
      const childNodeTree = this.buildHierarchyNodes(
        relationships,
        childId,
        validation,
        level + 1,
        new Set(visited),
        currentPath
      );
      childNodes.push(...childNodeTree);
    }

    return [node, ...childNodes];
  }

  /**
   * Validate hierarchy structure
   */
  private async validateHierarchyStructure(
    relationships: EntityRelationship[],
    rootId: string,
    validation: HierarchyValidation
  ): Promise<void> {
    // Check if root is required and exists
    if (validation.requireRoot) {
      const hasRoot = relationships.some(
        (r) => r.childId === rootId && !relationships.some((r2) => r2.childId === r.parentId)
      ) || !relationships.some((r) => r.parentId === rootId);

      if (!hasRoot && relationships.length > 0) {
        // Root should not be a child of any other node
        const isChild = relationships.some((r) => r.childId === rootId);
        if (isChild) {
          throw new Error('Specified root entity is a child of another entity');
        }
      }
    }

    // Check for multiple parents
    if (!validation.allowMultipleParents) {
      const childCount = new Map<string, number>();
      for (const rel of relationships) {
        const count = childCount.get(rel.childId) || 0;
        childCount.set(rel.childId, count + 1);
        if (count + 1 > 1) {
          throw new Error(
            `Multiple parents detected for entity ${rel.childId}`
          );
        }
      }
    }

    // Check for cycles
    if (!validation.allowCycles) {
      this.detectCycles(relationships);
    }
  }

  /**
   * Detect cycles in relationship graph
   */
  private detectCycles(relationships: EntityRelationship[]): void {
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    for (const rel of relationships) {
      const children = adjacencyList.get(rel.parentId) || [];
      children.push(rel.childId);
      adjacencyList.set(rel.parentId, children);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const children = adjacencyList.get(node) || [];
      for (const child of children) {
        if (!visited.has(child)) {
          if (hasCycle(child)) {
            return true;
          }
        } else if (recursionStack.has(child)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    // Check all nodes
    for (const node of adjacencyList.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          throw new Error('Cycle detected in hierarchy');
        }
      }
    }
  }

  /**
   * Get all descendants of an entity
   */
  async getDescendants(
    entityId: string,
    relationships: EntityRelationship[],
    maxDepth?: number
  ): Promise<string[]> {
    return tracer.startActiveSpan(
      'HierarchyManager.getDescendants',
      async (span) => {
        try {
          span.setAttribute('entity.id', entityId);

          const descendants: string[] = [];
          const queue: Array<{ id: string; depth: number }> = [
            { id: entityId, depth: 0 },
          ];
          const visited = new Set<string>([entityId]);

          while (queue.length > 0) {
            const { id, depth } = queue.shift()!;

            if (maxDepth && depth >= maxDepth) {
              continue;
            }

            // Find children
            const children = relationships
              .filter((r) => r.parentId === id)
              .map((r) => r.childId);

            for (const childId of children) {
              if (!visited.has(childId)) {
                visited.add(childId);
                descendants.push(childId);
                queue.push({ id: childId, depth: depth + 1 });
              }
            }
          }

          span.setAttribute('descendants.count', descendants.length);
          return descendants;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Get all ancestors of an entity
   */
  async getAncestors(
    entityId: string,
    relationships: EntityRelationship[]
  ): Promise<string[]> {
    return tracer.startActiveSpan(
      'HierarchyManager.getAncestors',
      async (span) => {
        try {
          span.setAttribute('entity.id', entityId);

          const ancestors: string[] = [];
          let currentId = entityId;
          const visited = new Set<string>([entityId]);

          while (true) {
            const parent = relationships.find((r) => r.childId === currentId);
            if (!parent) {
              break;
            }

            if (visited.has(parent.parentId)) {
              // Cycle detected
              break;
            }

            visited.add(parent.parentId);
            ancestors.push(parent.parentId);
            currentId = parent.parentId;
          }

          span.setAttribute('ancestors.count', ancestors.length);
          return ancestors;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Get siblings of an entity
   */
  async getSiblings(
    entityId: string,
    relationships: EntityRelationship[]
  ): Promise<string[]> {
    return tracer.startActiveSpan(
      'HierarchyManager.getSiblings',
      async (span) => {
        try {
          span.setAttribute('entity.id', entityId);

          // Find parent
          const parentRel = relationships.find((r) => r.childId === entityId);
          if (!parentRel) {
            return [];
          }

          // Find all children of parent (excluding self)
          const siblings = relationships
            .filter(
              (r) =>
                r.parentId === parentRel.parentId && r.childId !== entityId
            )
            .map((r) => r.childId);

          span.setAttribute('siblings.count', siblings.length);
          return siblings;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Find path between two entities
   */
  async findPath(
    fromEntityId: string,
    toEntityId: string,
    relationships: EntityRelationship[]
  ): Promise<HierarchyPath | null> {
    return tracer.startActiveSpan(
      'HierarchyManager.findPath',
      async (span) => {
        try {
          span.setAttribute('from.entity.id', fromEntityId);
          span.setAttribute('to.entity.id', toEntityId);

          // BFS to find shortest path
          const queue: Array<{
            id: string;
            path: string[];
            rels: EntityRelationship[];
          }> = [{ id: fromEntityId, path: [fromEntityId], rels: [] }];
          const visited = new Set<string>([fromEntityId]);

          while (queue.length > 0) {
            const { id, path, rels } = queue.shift()!;

            if (id === toEntityId) {
              const result: HierarchyPath = {
                from: fromEntityId,
                to: toEntityId,
                path,
                distance: path.length - 1,
                relationships: rels,
              };
              span.setAttribute('path.distance', result.distance);
              return result;
            }

            // Check children
            const childRels = relationships.filter((r) => r.parentId === id);
            for (const rel of childRels) {
              if (!visited.has(rel.childId)) {
                visited.add(rel.childId);
                queue.push({
                  id: rel.childId,
                  path: [...path, rel.childId],
                  rels: [...rels, rel],
                });
              }
            }

            // Check parents (bidirectional search)
            const parentRels = relationships.filter((r) => r.childId === id);
            for (const rel of parentRels) {
              if (!visited.has(rel.parentId)) {
                visited.add(rel.parentId);
                queue.push({
                  id: rel.parentId,
                  path: [...path, rel.parentId],
                  rels: [...rels, rel],
                });
              }
            }
          }

          return null;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Calculate hierarchy statistics
   */
  async calculateStats(
    hierarchy: EntityHierarchy
  ): Promise<HierarchyStats> {
    return tracer.startActiveSpan(
      'HierarchyManager.calculateStats',
      async (span) => {
        try {
          const leafNodes = hierarchy.nodes.filter((n) => n.isLeaf);
          const rootNodes = hierarchy.nodes.filter((n) => !n.parentId);

          // Calculate average branching factor
          const nodesWithChildren = hierarchy.nodes.filter(
            (n) => n.children.length > 0
          );
          const totalChildren = nodesWithChildren.reduce(
            (sum, n) => sum + n.children.length,
            0
          );
          const averageBranchingFactor =
            nodesWithChildren.length > 0
              ? totalChildren / nodesWithChildren.length
              : 0;

          const stats: HierarchyStats = {
            totalNodes: hierarchy.nodes.length,
            totalRelationships: hierarchy.nodes.reduce(
              (sum, n) => sum + n.children.length,
              0
            ),
            maxDepth: hierarchy.depth,
            leafNodes: leafNodes.length,
            rootNodes: rootNodes.length,
            averageBranchingFactor: Math.round(averageBranchingFactor * 100) / 100,
          };

          return stats;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Flatten hierarchy to list
   */
  async flattenHierarchy(
    hierarchy: EntityHierarchy,
    includeMetadata: boolean = true
  ): Promise<Array<{ entityId: string; level: number; path: string[] }>> {
    return hierarchy.nodes.map((node) => ({
      entityId: node.entityId,
      level: node.level,
      path: node.path,
      ...(includeMetadata && { attributes: node.attributes }),
    }));
  }

  /**
   * Get subtree starting from a node
   */
  async getSubtree(
    hierarchy: EntityHierarchy,
    entityId: string
  ): Promise<HierarchyNode[]> {
    return tracer.startActiveSpan(
      'HierarchyManager.getSubtree',
      async (span) => {
        try {
          span.setAttribute('entity.id', entityId);

          const node = hierarchy.nodes.find((n) => n.entityId === entityId);
          if (!node) {
            return [];
          }

          // Get all descendants
          const descendants = hierarchy.nodes.filter((n) =>
            n.path.includes(entityId)
          );

          span.setAttribute('subtree.nodes', descendants.length);
          return descendants;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Merge two hierarchies
   */
  async mergeHierarchies(
    hierarchy1: EntityHierarchy,
    hierarchy2: EntityHierarchy,
    mergeStrategy: 'union' | 'intersection' = 'union'
  ): Promise<EntityHierarchy> {
    return tracer.startActiveSpan(
      'HierarchyManager.mergeHierarchies',
      async (span) => {
        try {
          span.setAttribute('strategy', mergeStrategy);

          if (hierarchy1.domain !== hierarchy2.domain) {
            throw new Error('Cannot merge hierarchies from different domains');
          }

          let mergedNodes: HierarchyNode[];

          if (mergeStrategy === 'union') {
            // Combine all nodes, removing duplicates
            const nodeMap = new Map<string, HierarchyNode>();
            [...hierarchy1.nodes, ...hierarchy2.nodes].forEach((node) => {
              nodeMap.set(node.entityId, node);
            });
            mergedNodes = Array.from(nodeMap.values());
          } else {
            // Only include nodes present in both
            const ids1 = new Set(hierarchy1.nodes.map((n) => n.entityId));
            mergedNodes = hierarchy2.nodes.filter((n) =>
              ids1.has(n.entityId)
            );
          }

          const mergedHierarchy: EntityHierarchy = {
            hierarchyId: uuidv4(),
            name: `${hierarchy1.name} + ${hierarchy2.name}`,
            domain: hierarchy1.domain,
            rootEntityId: hierarchy1.rootEntityId,
            depth: Math.max(...mergedNodes.map((n) => n.level), 0),
            nodes: mergedNodes,
            relationType: hierarchy1.relationType,
            isActive: true,
            effectiveDate: new Date(),
            metadata: {
              mergedFrom: [hierarchy1.hierarchyId, hierarchy2.hierarchyId],
              mergeStrategy,
            },
          };

          span.setAttribute('merged.nodes', mergedNodes.length);
          return mergedHierarchy;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Validate entity can be added to hierarchy
   */
  async validateEntityAddition(
    hierarchy: EntityHierarchy,
    parentId: string,
    entityId: string,
    validation?: HierarchyValidation
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const validationRules = validation ?? this.config.defaultValidation;

    // Check if entity already exists
    if (hierarchy.nodes.some((n) => n.entityId === entityId)) {
      errors.push('Entity already exists in hierarchy');
    }

    // Check if parent exists
    const parentNode = hierarchy.nodes.find((n) => n.entityId === parentId);
    if (!parentNode) {
      errors.push('Parent entity not found in hierarchy');
    }

    // Check max depth
    if (validationRules.maxDepth && parentNode) {
      if (parentNode.level + 1 > validationRules.maxDepth) {
        errors.push(`Would exceed maximum depth ${validationRules.maxDepth}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Determine primary relation type from relationships
   */
  private determineRelationType(
    relationships: EntityRelationship[]
  ): HierarchyRelationType {
    if (relationships.length === 0) {
      return 'parent_child';
    }

    // Count relation types
    const typeCounts = new Map<HierarchyRelationType, number>();
    for (const rel of relationships) {
      const count = typeCounts.get(rel.relationType) || 0;
      typeCounts.set(rel.relationType, count + 1);
    }

    // Return most common type
    let maxCount = 0;
    let primaryType: HierarchyRelationType = 'parent_child';
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryType = type;
      }
    }

    return primaryType;
  }

  /**
   * Invalidate cache for entity
   */
  private invalidateCache(entityId: string): void {
    if (!this.config.enableCaching) {
      return;
    }

    this.relationshipCache.delete(entityId);

    // Remove hierarchies containing this entity
    for (const [hierarchyId, hierarchy] of this.hierarchyCache) {
      if (hierarchy.nodes.some((n) => n.entityId === entityId)) {
        this.hierarchyCache.delete(hierarchyId);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.hierarchyCache.clear();
    this.relationshipCache.clear();
  }
}
