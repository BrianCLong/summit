"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeContext = makeContext;
/* eslint-disable @typescript-eslint/no-explicit-any */
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
function makeContext(req, logger) {
    const neo = neo4j_driver_1.default.driver(process.env.NEO4J_URI, neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
    const pg = new Pool({ connectionString: process.env.PG_CONNECTION });
    // Extract user from JWT payload attached by express-jwt middleware
    const auth = req.auth || {}; // req.auth will contain the decoded JWT payload
    const user = {
        sub: auth.sub || 'anonymous',
        tenantId: auth.tenantId || null, // Assuming tenantId is in the JWT payload
        roles: auth.roles || [], // Assuming roles are in the JWT payload
        isAuthenticated: !!auth.sub, // Check if a subject exists in the JWT
    };
    return {
        logger,
        user,
        neo,
        pg: {
            one: async (q, params = []) => (await pg.query(q, params)).rows[0],
            oneOrNone: async (q, params = []) => (await pg.query(q, params)).rows?.[0] || null,
            any: async (q, params = []) => (await pg.query(q, params)).rows,
        },
    };
}
