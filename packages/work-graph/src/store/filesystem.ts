/**
 * Summit Work Graph - FileSystem Graph Store
 *
 * "Artifact-first" persistence for Summit Tickets.
 * Stores Tickets as folders with `ticket.json` (eventually yaml) and evidence.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GraphStore } from './neo4j.js';
import type { WorkGraphNode } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

function validateId(id: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid ID format: ${id}. Only alphanumeric, dashes, and underscores allowed.`);
  }
}

function jsonReviver(key: string, value: any) {
  // ISO 8601 date format detection
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
    return new Date(value);
  }
  return value;
}

export class FileSystemGraphStore implements GraphStore {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async init() {
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'tickets'), { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'artifacts'), { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'nodes'), { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'edges'), { recursive: true });
  }

  // ============================================
  // Node Operations
  // ============================================

  async createNode<T extends WorkGraphNode>(node: T): Promise<T> {
    await this.init(); // Ensure dirs exist
    validateId(node.id);

    if (node.type === 'ticket') {
      const ticketDir = path.join(this.rootDir, 'tickets', node.id);
      await fs.mkdir(ticketDir, { recursive: true });
      await fs.writeFile(
        path.join(ticketDir, 'ticket.json'),
        JSON.stringify(node, null, 2)
      );
      await fs.mkdir(path.join(ticketDir, 'evidence'), { recursive: true });
      // Initialize logs
      await fs.writeFile(path.join(ticketDir, 'provenance.jsonl'), '');
      await fs.writeFile(path.join(ticketDir, 'decision_log.md'), '# Decision Log\n\n');
    } else if (node.type === 'evidence_bundle') {
      await fs.writeFile(
        path.join(this.rootDir, 'artifacts', `${node.id}.json`),
        JSON.stringify(node, null, 2)
      );
    } else {
      await fs.writeFile(
        path.join(this.rootDir, 'nodes', `${node.id}.json`),
        JSON.stringify(node, null, 2)
      );
    }
    return node;
  }

  async getNode<T extends WorkGraphNode>(id: string): Promise<T | null> {
    validateId(id);
    // Try ticket
    try {
      const content = await fs.readFile(path.join(this.rootDir, 'tickets', id, 'ticket.json'), 'utf-8');
      return JSON.parse(content, jsonReviver) as T;
    } catch (e) {
      // Ignore
    }

    // Try evidence bundle
    try {
      const content = await fs.readFile(path.join(this.rootDir, 'artifacts', `${id}.json`), 'utf-8');
      return JSON.parse(content, jsonReviver) as T;
    } catch (e) {
      // Ignore
    }

    // Try generic node
    try {
      const content = await fs.readFile(path.join(this.rootDir, 'nodes', `${id}.json`), 'utf-8');
      return JSON.parse(content, jsonReviver) as T;
    } catch (e) {
      // Ignore
    }

    return null;
  }

  async getNodes<T extends WorkGraphNode>(filter?: Partial<T>): Promise<T[]> {
    const nodes: T[] = [];

    // Helper to read all json files in a dir
    const readDir = async (dir: string) => {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(dir, file), 'utf-8');
            nodes.push(JSON.parse(content, jsonReviver) as T);
          }
        }
      } catch (e) {
        // Ignore if dir missing
      }
    };

    // Read nodes
    await readDir(path.join(this.rootDir, 'nodes'));
    await readDir(path.join(this.rootDir, 'artifacts'));

    // Read tickets
    try {
      const ticketDirs = await fs.readdir(path.join(this.rootDir, 'tickets'));
      for (const ticketId of ticketDirs) {
        try {
          const content = await fs.readFile(path.join(this.rootDir, 'tickets', ticketId, 'ticket.json'), 'utf-8');
          nodes.push(JSON.parse(content, jsonReviver) as T);
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    if (!filter) return nodes;

    return nodes.filter((node) => {
      for (const [key, value] of Object.entries(filter)) {
        if ((node as any)[key] !== value) return false;
      }
      return true;
    });
  }

  async updateNode<T extends WorkGraphNode>(id: string, updates: Partial<T>): Promise<T | null> {
    validateId(id);
    const node = await this.getNode<T>(id);
    if (!node) return null;

    const updated = { ...node, ...updates, updatedAt: new Date() };
    await this.createNode(updated); // Overwrite
    return updated;
  }

  async deleteNode(id: string): Promise<boolean> {
    validateId(id);
    const node = await this.getNode(id);
    if (!node) return false;

    if (node.type === 'ticket') {
      await fs.rm(path.join(this.rootDir, 'tickets', id), { recursive: true, force: true });
    } else if (node.type === 'evidence_bundle') {
      await fs.rm(path.join(this.rootDir, 'artifacts', `${id}.json`));
    } else {
      await fs.rm(path.join(this.rootDir, 'nodes', `${id}.json`));
    }
    return true;
  }

  // ============================================
  // Edge Operations
  // ============================================

  async createEdge<T extends WorkGraphEdge>(edge: T): Promise<T> {
    await this.init();
    validateId(edge.id);
    await fs.writeFile(
      path.join(this.rootDir, 'edges', `${edge.id}.json`),
      JSON.stringify(edge, null, 2)
    );
    return edge;
  }

  async getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<WorkGraphEdge[]> {
    const edges: WorkGraphEdge[] = [];
    try {
      const files = await fs.readdir(path.join(this.rootDir, 'edges'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.rootDir, 'edges', file), 'utf-8');
          edges.push(JSON.parse(content, jsonReviver));
        }
      }
    } catch (e) {
      // ignore
    }

    if (!filter) return edges;

    return edges.filter((edge) => {
      if (filter.sourceId && edge.sourceId !== filter.sourceId) return false;
      if (filter.targetId && edge.targetId !== filter.targetId) return false;
      if (filter.type && edge.type !== filter.type) return false;
      return true;
    });
  }

  async deleteEdge(id: string): Promise<boolean> {
    validateId(id);
    try {
      await fs.rm(path.join(this.rootDir, 'edges', `${id}.json`));
      return true;
    } catch (e) {
      return false;
    }
  }
}
