"use strict";
/**
 * Mesh Registry - Service Discovery and Node Registration
 * Maintains distributed registry of all meshes and nodes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshRegistry = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class MeshRegistry {
    redis;
    MESH_PREFIX = 'mesh:';
    NODE_PREFIX = 'node:';
    MESH_INDEX = 'meshes:index';
    NODE_INDEX = 'nodes:index';
    constructor(redisUrl) {
        this.redis = new ioredis_1.default(redisUrl);
    }
    /**
     * Register a mesh in the registry
     */
    async registerMesh(mesh) {
        const key = `${this.MESH_PREFIX}${mesh.id}`;
        await this.redis.set(key, JSON.stringify(mesh));
        await this.redis.sadd(this.MESH_INDEX, mesh.id);
        await this.redis.sadd(`tenant:${mesh.tenantId}:meshes`, mesh.id);
    }
    /**
     * Unregister a mesh
     */
    async unregisterMesh(meshId) {
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
    async getMesh(meshId) {
        const data = await this.redis.get(`${this.MESH_PREFIX}${meshId}`);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Get all meshes
     */
    async getAllMeshes() {
        const ids = await this.redis.smembers(this.MESH_INDEX);
        const meshes = [];
        for (const id of ids) {
            const mesh = await this.getMesh(id);
            if (mesh)
                meshes.push(mesh);
        }
        return meshes;
    }
    /**
     * Get meshes by tenant
     */
    async getMeshesByTenant(tenantId) {
        const ids = await this.redis.smembers(`tenant:${tenantId}:meshes`);
        const meshes = [];
        for (const id of ids) {
            const mesh = await this.getMesh(id);
            if (mesh)
                meshes.push(mesh);
        }
        return meshes;
    }
    /**
     * Register a node
     */
    async registerNode(meshId, node) {
        const key = `${this.NODE_PREFIX}${meshId}:${node.id}`;
        await this.redis.set(key, JSON.stringify(node));
        await this.redis.sadd(`${this.NODE_INDEX}:${meshId}`, node.id);
        // Add to capability index
        for (const capability of node.capabilities) {
            await this.redis.sadd(`capability:${capability}:nodes`, `${meshId}:${node.id}`);
        }
    }
    /**
     * Unregister a node
     */
    async unregisterNode(meshId, nodeId) {
        const node = await this.getNode(meshId, nodeId);
        if (node) {
            for (const capability of node.capabilities) {
                await this.redis.srem(`capability:${capability}:nodes`, `${meshId}:${nodeId}`);
            }
        }
        await this.redis.srem(`${this.NODE_INDEX}:${meshId}`, nodeId);
        await this.redis.del(`${this.NODE_PREFIX}${meshId}:${nodeId}`);
    }
    /**
     * Get a node
     */
    async getNode(meshId, nodeId) {
        const data = await this.redis.get(`${this.NODE_PREFIX}${meshId}:${nodeId}`);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Get all nodes in a mesh
     */
    async getNodes(meshId) {
        const ids = await this.redis.smembers(`${this.NODE_INDEX}:${meshId}`);
        const nodes = [];
        for (const id of ids) {
            const node = await this.getNode(meshId, id);
            if (node)
                nodes.push(node);
        }
        return nodes;
    }
    /**
     * Find nodes by capability
     */
    async findNodesByCapability(capability) {
        return this.redis.smembers(`capability:${capability}:nodes`);
    }
    /**
     * Update node status
     */
    async updateNodeStatus(meshId, nodeId, status) {
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
    async recordHeartbeat(meshId, nodeId) {
        const key = `heartbeat:${meshId}:${nodeId}`;
        await this.redis.setex(key, 60, new Date().toISOString());
    }
    /**
     * Check if node is alive based on heartbeat
     */
    async isNodeAlive(meshId, nodeId) {
        const heartbeat = await this.redis.get(`heartbeat:${meshId}:${nodeId}`);
        return heartbeat !== null;
    }
    /**
     * Close Redis connection
     */
    async close() {
        await this.redis.quit();
    }
}
exports.MeshRegistry = MeshRegistry;
