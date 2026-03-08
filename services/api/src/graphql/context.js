"use strict";
/**
 * IntelGraph GraphQL Context Creation
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const neo4j_js_1 = require("../db/neo4j.js");
const postgres_js_1 = require("../db/postgres.js");
const redis_js_1 = require("../db/redis.js");
const logger_js_1 = require("../utils/logger.js");
async function createContext({ req, res, }) {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    const startTime = Date.now();
    // Extract user and tenant from middleware
    const user = req.user;
    const tenant = req.tenant;
    return {
        req,
        res,
        user,
        tenant,
        dataSources: {
            neo4j: neo4j_js_1.neo4jDriver,
            postgres: postgres_js_1.postgresPool,
            redis: redis_js_1.redisClient,
        },
        logger: logger_js_1.logger.child({
            requestId,
            userId: user?.id,
            tenantId: tenant?.id,
        }),
        requestId,
        startTime,
    };
}
function generateRequestId() {
    return (Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15));
}
