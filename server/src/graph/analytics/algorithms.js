"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphAnalytics = void 0;
const store_js_1 = require("../store.js");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
class GraphAnalytics {
    store;
    constructor() {
        this.store = new store_js_1.GraphStore();
    }
    async getDegreeCentrality(tenantId, limit = 10) {
        const cypher = `
      MATCH (n:GraphNode { tenantId: $tenantId })
      OPTIONAL MATCH (n)-[r]-(m) // Undirected degree
      WITH n, count(r) as degree
      ORDER BY degree DESC
      LIMIT $limit
      RETURN n.globalId, n.entityType, n.attributes.name, degree
    `;
        return await this.store.runCypher(cypher, { tenantId, limit: neo4j_driver_1.default.int(limit) }, { tenantId });
    }
    async getShortestPath(tenantId, startId, endId) {
        const cypher = `
      MATCH (start:GraphNode { globalId: $startId, tenantId: $tenantId }),
            (end:GraphNode { globalId: $endId, tenantId: $tenantId }),
            p = shortestPath((start)-[*]-(end))
      RETURN p
    `;
        return await this.store.runCypher(cypher, { tenantId, startId, endId }, { tenantId });
    }
}
exports.GraphAnalytics = GraphAnalytics;
