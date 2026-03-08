"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRelation = exports.addCapabilityNode = exports.getSession = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'));
const getSession = () => driver.session();
exports.getSession = getSession;
const addCapabilityNode = async (capabilityId) => {
    const session = (0, exports.getSession)();
    await session.run('MERGE (c:Capability {id: $id}) RETURN c', { id: capabilityId });
    await session.close();
};
exports.addCapabilityNode = addCapabilityNode;
const addRelation = async (fromId, toId, type) => {
    const session = (0, exports.getSession)();
    await session.run(`
    MATCH (a:Capability {id: $from}), (b:Capability {id: $to})
    MERGE (a)-[r:${type}]->(b)
    RETURN r
    `, { from: fromId, to: toId });
    await session.close();
};
exports.addRelation = addRelation;
