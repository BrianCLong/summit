"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoaders = void 0;
// @ts-nocheck
const dataloader_1 = __importDefault(require("dataloader"));
const database_js_1 = require("../config/database.js");
const supportTicketLoader_js_1 = require("./dataloaders/supportTicketLoader.js");
// Example User Loader (Postgres)
const batchUsers = async (userIds) => {
    const pool = (0, database_js_1.getPostgresPool)();
    // Safe integer parsing or UUID check would be good here
    const query = 'SELECT id, email, username, role FROM users WHERE id = ANY($1)';
    try {
        const result = await pool.query(query, [userIds]);
        const userMap = new Map(result.rows.map(u => [u.id, u]));
        return userIds.map(id => userMap.get(id) || new Error(`User not found: ${id}`));
    }
    catch (err) {
        return userIds.map(() => err);
    }
};
// Example Entity Loader (Neo4j)
const batchEntities = async (entityIds) => {
    const driver = (0, database_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (n) WHERE elementId(n) IN $ids OR n.id IN $ids
            RETURN n
            `, { ids: entityIds });
        const entityMap = new Map();
        result.records.forEach(record => {
            const node = record.get('n');
            const id = node.properties.id || node.elementId;
            entityMap.set(id, node.properties);
        });
        return entityIds.map(id => entityMap.get(id) || new Error(`Entity not found: ${id}`));
    }
    catch (err) {
        return entityIds.map(() => err);
    }
    finally {
        await session.close();
    }
};
const createLoaders = () => ({
    userLoader: new dataloader_1.default(batchUsers),
    entityLoader: new dataloader_1.default(batchEntities),
    supportTicketLoader: (0, supportTicketLoader_js_1.createSupportTicketLoader)(),
});
exports.createLoaders = createLoaders;
