/**
 * Network visualization layout algorithms
 */

import type { Graph, Node, VisualizationOptions, LayoutConfig } from '@intelgraph/network-analysis';

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface LayoutedNode extends Node {
  position: Position;
}

export interface LayoutedGraph {
  nodes: LayoutedNode[];
  edges: Array<{
    source: string;
    target: string;
    weight?: number;
  }>;
}

export class LayoutEngine {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Apply layout to graph
   */
  applyLayout(config: LayoutConfig): LayoutedGraph {
    switch (config.type) {
      case 'force-directed':
        return this.forceDirectedLayout(config.parameters);
      case 'hierarchical':
        return this.hierarchicalLayout(config.parameters);
      case 'circular':
        return this.circularLayout(config.parameters);
      case 'geographic':
        return this.geographicLayout(config.parameters);
      case 'timeline':
        return this.timelineLayout(config.parameters);
      default:
        return this.forceDirectedLayout({});
    }
  }

  /**
   * Force-directed layout (Fruchterman-Reingold algorithm)
   */
  forceDirectedLayout(parameters: Record<string, any>): LayoutedGraph {
    const {
      iterations = 100,
      width = 800,
      height = 600,
      k = 50, // Optimal distance
      temperature = 100
    } = parameters;

    // Initialize positions randomly
    const positions = new Map<string, Position>();
    this.graph.nodes.forEach((node, id) => {
      positions.set(id, {
        x: Math.random() * width,
        y: Math.random() * height
      });
    });

    // Calculate optimal distance
    const area = width * height;
    const optimalDistance = k * Math.sqrt(area / this.graph.nodes.size);

    // Iterate
    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();

      // Initialize forces
      this.graph.nodes.forEach((_, id) => {
        forces.set(id, { x: 0, y: 0 });
      });

      // Calculate repulsive forces (all pairs)
      const nodeIds = Array.from(this.graph.nodes.keys());
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const id1 = nodeIds[i];
          const id2 = nodeIds[j];

          const pos1 = positions.get(id1)!;
          const pos2 = positions.get(id2)!;

          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const repulsion = (optimalDistance * optimalDistance) / distance;
          const fx = (dx / distance) * repulsion;
          const fy = (dy / distance) * repulsion;

          const force1 = forces.get(id1)!;
          const force2 = forces.get(id2)!;

          force1.x += fx;
          force1.y += fy;
          force2.x -= fx;
          force2.y -= fy;
        }
      }

      // Calculate attractive forces (edges)
      this.graph.edges.forEach(edge => {
        const pos1 = positions.get(edge.source)!;
        const pos2 = positions.get(edge.target)!;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const attraction = (distance * distance) / optimalDistance;
        const fx = (dx / distance) * attraction;
        const fy = (dy / distance) * attraction;

        const force1 = forces.get(edge.source)!;
        const force2 = forces.get(edge.target)!;

        force1.x += fx;
        force1.y += fy;
        force2.x -= fx;
        force2.y -= fy;
      });

      // Apply forces with temperature cooling
      const t = temperature * (1 - iter / iterations);

      forces.forEach((force, id) => {
        const pos = positions.get(id)!;
        const displacement = Math.sqrt(force.x * force.x + force.y * force.y) || 1;

        pos.x += (force.x / displacement) * Math.min(displacement, t);
        pos.y += (force.y / displacement) * Math.min(displacement, t);

        // Keep within bounds
        pos.x = Math.max(0, Math.min(width, pos.x));
        pos.y = Math.max(0, Math.min(height, pos.y));
      });
    }

    return this.buildLayoutedGraph(positions);
  }

  /**
   * Hierarchical layout
   */
  hierarchicalLayout(parameters: Record<string, any>): LayoutedGraph {
    const {
      width = 800,
      height = 600,
      levelSeparation = 100,
      nodeSeparation = 50
    } = parameters;

    // Assign levels using BFS from roots
    const levels = this.assignLevels();
    const positions = new Map<string, Position>();

    // Position nodes level by level
    levels.forEach((nodeIds, level) => {
      const y = level * levelSeparation;
      const nodesInLevel = nodeIds.length;
      const totalWidth = (nodesInLevel - 1) * nodeSeparation;
      const startX = (width - totalWidth) / 2;

      nodeIds.forEach((nodeId, index) => {
        positions.set(nodeId, {
          x: startX + index * nodeSeparation,
          y
        });
      });
    });

    return this.buildLayoutedGraph(positions);
  }

  /**
   * Circular layout
   */
  circularLayout(parameters: Record<string, any>): LayoutedGraph {
    const {
      width = 800,
      height = 600,
      radius = Math.min(width, height) / 2 - 50
    } = parameters;

    const positions = new Map<string, Position>();
    const nodeIds = Array.from(this.graph.nodes.keys());
    const angleStep = (2 * Math.PI) / nodeIds.length;

    nodeIds.forEach((nodeId, index) => {
      const angle = index * angleStep;
      positions.set(nodeId, {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle)
      });
    });

    return this.buildLayoutedGraph(positions);
  }

  /**
   * Geographic layout (based on node attributes)
   */
  geographicLayout(parameters: Record<string, any>): LayoutedGraph {
    const {
      width = 800,
      height = 600,
      latitudeKey = 'latitude',
      longitudeKey = 'longitude'
    } = parameters;

    const positions = new Map<string, Position>();

    // Find bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    this.graph.nodes.forEach((node) => {
      const lat = node.attributes?.[latitudeKey];
      const lon = node.attributes?.[longitudeKey];

      if (lat !== undefined && lon !== undefined) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      }
    });

    // Map to screen coordinates
    this.graph.nodes.forEach((node, id) => {
      const lat = node.attributes?.[latitudeKey];
      const lon = node.attributes?.[longitudeKey];

      if (lat !== undefined && lon !== undefined) {
        const x = ((lon - minLon) / (maxLon - minLon)) * width;
        const y = height - ((lat - minLat) / (maxLat - minLat)) * height;

        positions.set(id, { x, y });
      } else {
        // Place at center if no coordinates
        positions.set(id, { x: width / 2, y: height / 2 });
      }
    });

    return this.buildLayoutedGraph(positions);
  }

  /**
   * Timeline layout (based on temporal attributes)
   */
  timelineLayout(parameters: Record<string, any>): LayoutedGraph {
    const {
      width = 800,
      height = 600,
      timeKey = 'timestamp',
      groupKey = 'group'
    } = parameters;

    const positions = new Map<string, Position>();

    // Extract timestamps
    const timestamps = new Map<string, number>();
    this.graph.nodes.forEach((node, id) => {
      const time = node.attributes?.[timeKey];
      if (time !== undefined) {
        const timestamp = typeof time === 'number' ? time : new Date(time).getTime();
        timestamps.set(id, timestamp);
      }
    });

    // Find time bounds
    const times = Array.from(timestamps.values());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Group nodes
    const groups = new Map<string, string[]>();
    this.graph.nodes.forEach((node, id) => {
      const group = node.attributes?.[groupKey] || 'default';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(id);
    });

    // Position nodes
    const groupHeight = height / groups.size;

    Array.from(groups.entries()).forEach(([group, nodeIds], groupIndex) => {
      const y = groupIndex * groupHeight + groupHeight / 2;

      nodeIds.forEach(nodeId => {
        const time = timestamps.get(nodeId);
        if (time !== undefined) {
          const x = ((time - minTime) / (maxTime - minTime)) * width;
          positions.set(nodeId, { x, y });
        } else {
          positions.set(nodeId, { x: 0, y });
        }
      });
    });

    return this.buildLayoutedGraph(positions);
  }

  /**
   * Assign levels for hierarchical layout
   */
  private assignLevels(): Map<number, string[]> {
    const levels = new Map<number, string[]>();
    const nodeLevel = new Map<string, number>();
    const visited = new Set<string>();

    // Find root nodes (nodes with no incoming edges)
    const roots: string[] = [];
    this.graph.nodes.forEach((_, nodeId) => {
      const hasIncoming = this.graph.edges.some(edge => edge.target === nodeId);
      if (!hasIncoming) {
        roots.push(nodeId);
      }
    });

    // If no roots found, use arbitrary starting point
    if (roots.length === 0) {
      roots.push(Array.from(this.graph.nodes.keys())[0]);
    }

    // BFS from roots
    const queue: Array<{ nodeId: string; level: number }> = roots.map(id => ({ nodeId: id, level: 0 }));

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      nodeLevel.set(nodeId, level);

      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(nodeId);

      // Add neighbors to queue
      this.graph.edges.forEach(edge => {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          queue.push({ nodeId: edge.target, level: level + 1 });
        }
      });
    }

    // Handle unvisited nodes
    this.graph.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        const level = levels.size;
        nodeLevel.set(nodeId, level);

        if (!levels.has(level)) {
          levels.set(level, []);
        }
        levels.get(level)!.push(nodeId);
      }
    });

    return levels;
  }

  /**
   * Build layouted graph from positions
   */
  private buildLayoutedGraph(positions: Map<string, Position>): LayoutedGraph {
    const nodes: LayoutedNode[] = [];

    this.graph.nodes.forEach((node, id) => {
      const position = positions.get(id) || { x: 0, y: 0 };
      nodes.push({
        ...node,
        position
      });
    });

    return {
      nodes,
      edges: this.graph.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight
      }))
    };
  }
}
