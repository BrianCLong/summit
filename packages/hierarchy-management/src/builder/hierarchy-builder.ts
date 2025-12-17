/**
 * Hierarchy Builder
 * Build and manage hierarchical structures for various domains
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Hierarchy,
  HierarchyNode,
  HierarchyType,
  HierarchyStatus
} from '@summit/mdm-core';

export class HierarchyBuilder {
  private hierarchies: Map<string, Hierarchy>;
  private nodes: Map<string, HierarchyNode>;
  private nodesByHierarchy: Map<string, Set<string>>;

  constructor() {
    this.hierarchies = new Map();
    this.nodes = new Map();
    this.nodesByHierarchy = new Map();
  }

  /**
   * Create new hierarchy
   */
  async createHierarchy(
    name: string,
    description: string,
    domain: string,
    hierarchyType: HierarchyType
  ): Promise<Hierarchy> {
    const hierarchyId = uuidv4();
    const rootNodeId = uuidv4();

    // Create root node
    const rootNode: HierarchyNode = {
      id: rootNodeId,
      hierarchyId,
      level: 0,
      path: `/${rootNodeId}`,
      name: `${name} Root`,
      masterRecordId: '',
      children: [],
      attributes: {},
      sortOrder: 0,
      isLeaf: false
    };

    this.nodes.set(rootNodeId, rootNode);

    const hierarchy: Hierarchy = {
      id: hierarchyId,
      name,
      description,
      domain,
      hierarchyType,
      rootNodeId,
      depth: 1,
      totalNodes: 1,
      status: 'active',
      metadata: {
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
        updatedBy: 'system',
        version: 1,
        tags: [],
        customAttributes: {}
      }
    };

    this.hierarchies.set(hierarchyId, hierarchy);
    this.nodesByHierarchy.set(hierarchyId, new Set([rootNodeId]));

    return hierarchy;
  }

  /**
   * Add node to hierarchy
   */
  async addNode(
    hierarchyId: string,
    parentId: string,
    name: string,
    masterRecordId: string,
    attributes: Record<string, unknown> = {}
  ): Promise<HierarchyNode> {
    const hierarchy = this.hierarchies.get(hierarchyId);
    if (!hierarchy) {
      throw new Error(`Hierarchy ${hierarchyId} not found`);
    }

    const parent = this.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent node ${parentId} not found`);
    }

    const nodeId = uuidv4();
    const node: HierarchyNode = {
      id: nodeId,
      hierarchyId,
      parentId,
      level: parent.level + 1,
      path: `${parent.path}/${nodeId}`,
      name,
      masterRecordId,
      children: [],
      attributes,
      sortOrder: parent.children.length,
      isLeaf: true
    };

    this.nodes.set(nodeId, node);
    parent.children.push(nodeId);
    parent.isLeaf = false;

    const hierarchyNodes = this.nodesByHierarchy.get(hierarchyId);
    if (hierarchyNodes) {
      hierarchyNodes.add(nodeId);
    }

    // Update hierarchy metadata
    hierarchy.totalNodes++;
    hierarchy.depth = Math.max(hierarchy.depth, node.level + 1);
    hierarchy.metadata.updatedAt = new Date();

    return node;
  }

  /**
   * Move node to new parent
   */
  async moveNode(
    nodeId: string,
    newParentId: string
  ): Promise<HierarchyNode> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const newParent = this.nodes.get(newParentId);
    if (!newParent) {
      throw new Error(`Parent node ${newParentId} not found`);
    }

    if (node.hierarchyId !== newParent.hierarchyId) {
      throw new Error('Cannot move node across hierarchies');
    }

    // Remove from old parent
    if (node.parentId) {
      const oldParent = this.nodes.get(node.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== nodeId);
        if (oldParent.children.length === 0) {
          oldParent.isLeaf = true;
        }
      }
    }

    // Add to new parent
    node.parentId = newParentId;
    node.level = newParent.level + 1;
    node.path = `${newParent.path}/${nodeId}`;
    node.sortOrder = newParent.children.length;

    newParent.children.push(nodeId);
    newParent.isLeaf = false;

    // Update child paths recursively
    this.updateChildPaths(node);

    return node;
  }

  /**
   * Update child paths recursively
   */
  private updateChildPaths(node: HierarchyNode): void {
    for (const childId of node.children) {
      const child = this.nodes.get(childId);
      if (child) {
        child.level = node.level + 1;
        child.path = `${node.path}/${childId}`;
        this.updateChildPaths(child);
      }
    }
  }

  /**
   * Get hierarchy
   */
  async getHierarchy(id: string): Promise<Hierarchy | undefined> {
    return this.hierarchies.get(id);
  }

  /**
   * Get node
   */
  async getNode(id: string): Promise<HierarchyNode | undefined> {
    return this.nodes.get(id);
  }

  /**
   * Get children of node
   */
  async getChildren(nodeId: string): Promise<HierarchyNode[]> {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    return node.children
      .map(id => this.nodes.get(id))
      .filter((n): n is HierarchyNode => n !== undefined);
  }

  /**
   * Get descendants of node (all levels)
   */
  async getDescendants(nodeId: string): Promise<HierarchyNode[]> {
    const descendants: HierarchyNode[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.getChildren(currentId);
      descendants.push(...children);
      queue.push(...children.map(c => c.id));
    }

    return descendants;
  }

  /**
   * Get ancestors of node
   */
  async getAncestors(nodeId: string): Promise<HierarchyNode[]> {
    const ancestors: HierarchyNode[] = [];
    let currentNode = this.nodes.get(nodeId);

    while (currentNode?.parentId) {
      const parent = this.nodes.get(currentNode.parentId);
      if (parent) {
        ancestors.push(parent);
        currentNode = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Delete node and all descendants
   */
  async deleteNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Delete all descendants
    const descendants = await this.getDescendants(nodeId);
    for (const desc of descendants) {
      this.nodes.delete(desc.id);
      const hierarchyNodes = this.nodesByHierarchy.get(desc.hierarchyId);
      if (hierarchyNodes) {
        hierarchyNodes.delete(desc.id);
      }
    }

    // Remove from parent
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== nodeId);
        if (parent.children.length === 0) {
          parent.isLeaf = true;
        }
      }
    }

    // Delete node
    this.nodes.delete(nodeId);
    const hierarchyNodes = this.nodesByHierarchy.get(node.hierarchyId);
    if (hierarchyNodes) {
      hierarchyNodes.delete(nodeId);
    }

    // Update hierarchy
    const hierarchy = this.hierarchies.get(node.hierarchyId);
    if (hierarchy) {
      hierarchy.totalNodes -= (descendants.length + 1);
      hierarchy.metadata.updatedAt = new Date();
    }
  }
}
