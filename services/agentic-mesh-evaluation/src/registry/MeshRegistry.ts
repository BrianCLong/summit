/**
 * Mesh Registry - Service Discovery and Node Registration
 * Maintains distributed registry of all meshes and nodes
 */

import Redis from 'ioredis';
import type { AgenticMesh, MeshNode } from '../types/mesh.js';

export class MeshRegistry {
  private redis: Redis;
  private readonly MESH_PREFIX = 'mesh:';
  private readonly NODE_PREFIX = 'node:';
  private readonly MESH_INDEX = 'meshes:index';
  private readonly NODE_INDEX = 'nodes:index';

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  /**
   * Register a mesh in the registry
   */
  async registerMesh(mesh: AgenticMesh): Promise<void> {
    const key = `${this.MESH_PREFIX}${mesh.id}`;
    await this.redis.set(key, JSON.stringify(mesh));
    await this.redis.sadd(this.MESH_INDEX, mesh.id);
    await this.redis.sadd(`tenant:${mesh.tenantId}:meshes`, mesh.id);
  }

  /**
   * Unregister a mesh
   */
  async unregisterMesh(meshId: string): Promise<void> {
    const mesh = await this.getMesh(meshId);
    if (mesh) {
      await this.redis.srem(`tenant:${mesh.tenantId}:meshes`, meshId);
    }
    await this.redis.srem(this.MESH_INDEX, meshId);
    await this.redis.del(`${this.MESH_PREFIX}${meshId}`);
  }

  /**
   * Get a mesh by ID
   */
  async getMesh(meshId: string): Promise<AgenticMesh | null> {
    const data = await this.redis.get(`${this.MESH_PREFIX}${meshId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get all meshes
   */
  async getAllMeshes(): Promise<AgenticMesh[]> {
    const ids = await this.redis.smembers(this.MESH_INDEX);
    const meshes: AgenticMesh[] = [];

    for (const id of ids) {
      const mesh = await this.getMesh(id);
      if (mesh) meshes.push(mesh);
    }

    return meshes;
  }

  /**
   * Get meshes by tenant
   */
  async getMeshesByTenant(tenantId: string): Promise<AgenticMesh[]> {
    const ids = await this.redis.smembers(`tenant:${tenantId}:meshes`);
    const meshes: AgenticMesh[] = [];

    for (const id of ids) {
      const mesh = await this.getMesh(id);
      if (mesh) meshes.push(mesh);
    }

    return meshes;
  }

  /**
   * Register a node
   */
  async registerNode(meshId: string, node: MeshNode): Promise<void> {
    const key = `${this.NODE_PREFIX}${meshId}:${node.id}`;
    await this.redis.set(key, JSON.stringify(node));
    await this.redis.sadd(`${this.NODE_INDEX}:${meshId}`, node.id);

    // Add to capability index
    for (const capability of node.capabilities) {
      await this.redis.sadd(
        `capability:${capability}:nodes`,
        `${meshId}:${node.id}`
      );
    }
  }

  /**
   * Unregister a node
   */
  async unregisterNode(meshId: string, nodeId: string): Promise<void> {
    const node = await this.getNode(meshId, nodeId);
    if (node) {
      for (const capability of node.capabilities) {
        await this.redis.srem(
          `capability:${capability}:nodes`,
          `${meshId}:${nodeId}`
        );
      }
    }
    await this.redis.srem(`${this.NODE_INDEX}:${meshId}`, nodeId);
    await this.redis.del(`${this.NODE_PREFIX}${meshId}:${nodeId}`);
  }

  /**
   * Get a node
   */
  async getNode(meshId: string, nodeId: string): Promise<MeshNode | null> {
    const data = await this.redis.get(
      `${this.NODE_PREFIX}${meshId}:${nodeId}`
    );
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get all nodes in a mesh
   */
  async getNodes(meshId: string): Promise<MeshNode[]> {
    const ids = await this.redis.smembers(`${this.NODE_INDEX}:${meshId}`);
    const nodes: MeshNode[] = [];

    for (const id of ids) {
      const node = await this.getNode(meshId, id);
      if (node) nodes.push(node);
    }

    return nodes;
  }

  /**
   * Find nodes by capability
   */
  async findNodesByCapability(capability: string): Promise<string[]> {
    return this.redis.smembers(`capability:${capability}:nodes`);
  }

  /**
   * Update node status
   */
  async updateNodeStatus(
    meshId: string,
    nodeId: string,
    status: MeshNode['status']
  ): Promise<void> {
    const node = await this.getNode(meshId, nodeId);
    if (node) {
      node.status = status;
      node.updatedAt = new Date();
      await this.registerNode(meshId, node);
    }
  }

  /**
   * Record heartbeat
   */
  async recordHeartbeat(meshId: string, nodeId: string): Promise<void> {
    const key = `heartbeat:${meshId}:${nodeId}`;
    await this.redis.setex(key, 60, new Date().toISOString());
  }

  /**
   * Check if node is alive based on heartbeat
   */
  async isNodeAlive(meshId: string, nodeId: string): Promise<boolean> {
    const heartbeat = await this.redis.get(`heartbeat:${meshId}:${nodeId}`);
    return heartbeat !== null;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
