"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.neo = void 0;
exports.initializeNeo4jDriver = initializeNeo4jDriver;
exports.getNeo4jDriver = getNeo4jDriver;
exports.isNeo4jMockMode = isNeo4jMockMode;
exports.closeNeo4jDriver = closeNeo4jDriver;
exports.onNeo4jDriverReady = onNeo4jDriverReady;
exports.instrumentSession = instrumentSession;
exports.transformNeo4jIntegers = transformNeo4jIntegers;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const dotenv = __importStar(require("dotenv"));
const pino_1 = __importDefault(require("pino"));
const neo4jMetrics_js_1 = require("../metrics/neo4jMetrics.js");
const neo4jPerformanceMonitor_js_1 = require("./neo4jPerformanceMonitor.js");
const plan_sampler_js_1 = require("../lib/telemetry/plan-sampler.js");
dotenv.config();
const logger = pino_1.default();
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
const REQUIRE_REAL_DBS = process.env.REQUIRE_REAL_DBS === 'true';
const MAX_CONNECTION_POOL_SIZE = parseInt(process.env.NEO4J_MAX_CONNECTION_POOL_SIZE || '50', 10);
const CONNECTION_TIMEOUT_MS = parseInt(process.env.NEO4J_CONNECTION_TIMEOUT_MS || '30000', 10);
const ACQUISITION_TIMEOUT_MS = parseInt(process.env.NEO4J_POOL_ACQUISITION_TIMEOUT_MS || '5000', 10);
let realDriver = null;
let initializationPromise = null;
let isMockMode = true;
const readyCallbacks = [];
async function initializeNeo4jDriver() {
    if (initializationPromise)
        return initializationPromise;
    initializationPromise = (async () => {
        try {
            logger.info('Initializing Neo4j driver...');
            realDriver = neo4j_driver_1.default.driver(NEO4J_URI, neo4j_driver_1.default.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
                maxConnectionPoolSize: MAX_CONNECTION_POOL_SIZE,
                connectionTimeout: CONNECTION_TIMEOUT_MS,
                connectionAcquisitionTimeout: ACQUISITION_TIMEOUT_MS,
            });
            await realDriver.verifyConnectivity();
            isMockMode = false;
            logger.info('Neo4j driver initialized successfully.');
            neo4jMetrics_js_1.neo4jConnectivityUp.set(1);
            // Notify ready callbacks
            await Promise.all(readyCallbacks.map(cb => cb({ reason: 'driver_initialized' })));
        }
        catch (error) {
            neo4jMetrics_js_1.neo4jConnectivityUp.set(0);
            if (REQUIRE_REAL_DBS) {
                logger.error('Neo4j connectivity required but failed.', error);
                throw error;
            }
            else {
                logger.warn('Neo4j connection failed, falling back to mock mode.', error);
                isMockMode = true;
            }
        }
    })();
    return initializationPromise;
}
function getNeo4jDriver() {
    if (!realDriver && !isMockMode) {
        throw new Error('Neo4j driver not initialized. Call initializeNeo4jDriver() first.');
    }
    return realDriver;
}
function isNeo4jMockMode() {
    return isMockMode;
}
async function closeNeo4jDriver() {
    if (realDriver) {
        await realDriver.close();
        realDriver = null;
        initializationPromise = null;
        isMockMode = true;
        logger.info('Neo4j driver closed.');
    }
}
function onNeo4jDriverReady(callback) {
    readyCallbacks.push(callback);
}
// Helper to provide a unified interface like 'neo.session()'
// to avoid importing 'getNeo4jDriver' everywhere and handling nulls manually
exports.neo = {
    session: () => {
        if (isMockMode || !realDriver) {
            // Return a dummy session or throw?
            // For now, simple mock if needed or just rely on realDriver if available
            // But typically we should just return realDriver.session() if initialized
            const s = realDriver ? realDriver.session() : getNeo4jDriver().session();
            // Even in mock mode, if we have a session, we instrument it?
            // Mocks might not support PROFILE.
            // But if realDriver is present (just not initialized? No, getNeo4jDriver throws).
            // If mock mode is true, getNeo4jDriver returns something?
            // If we are truly in mock mode (no DB), instrumenting might be noisy.
            // We'll instrument only if realDriver is active or we want to test instrumentation.
            return instrumentSession(s);
        }
        return instrumentSession(realDriver.session());
    },
    run: async (query, params) => {
        const session = exports.neo.session();
        try {
            const result = await session.run(query, params);
            return result;
        }
        finally {
            await session.close();
        }
    }
};
function inferLabels(cypher) {
    const operation = /\b(create|merge|delete|set)\b/i.test(cypher)
        ? 'write'
        : 'read';
    const labelMatch = cypher.match(/:\s*([A-Za-z0-9_]+)/);
    return {
        operation,
        label: labelMatch?.[1] || 'unlabeled',
    };
}
function instrumentSession(session) {
    const run = async (cypher, params, txConfig) => {
        const start = Date.now();
        const labels = inferLabels(cypher);
        try {
            const result = await session.run(cypher, params, txConfig);
            const durationMs = Date.now() - start;
            neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor.recordSuccess({
                cypher,
                params,
                durationMs,
                labels,
            });
            // Plan Sampling
            if (!isNeo4jMockMode()) {
                await (0, plan_sampler_js_1.maybeSample)(cypher, params, durationMs, false, // hasError
                labels.operation, () => getNeo4jDriver().session());
            }
            return result;
        }
        catch (error) {
            const durationMs = Date.now() - start;
            neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor.recordError({
                cypher,
                params,
                durationMs,
                labels,
                error: error?.message ?? String(error),
            });
            // Plan Sampling on error
            if (!isNeo4jMockMode()) {
                await (0, plan_sampler_js_1.maybeSample)(cypher, params, durationMs, true, // hasError
                labels.operation, () => getNeo4jDriver().session());
            }
            throw error;
        }
    };
    return { ...session, run };
}
/**
 * Normalizes Neo4j query results by converting Neo4j Integers to standard JS numbers or strings.
 * This implementation is optimized to avoid unnecessary deep cloning when no Neo4j Integers are present.
 *
 * BOLT OPTIMIZATION:
 * - Avoids object/array allocation if no transformation is needed.
 * - Reduces GC pressure and CPU cycles for large result sets.
 * - Handles Neo4j Record-like objects (toObject).
 *
 * @param obj - The object or array to normalize.
 * @returns The normalized object or array.
 */
function transformNeo4jIntegers(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    // Handle Neo4j Integers
    if (neo4j_driver_1.default.isInt(obj)) {
        return obj.inSafeRange() ? obj.toNumber() : obj.toString();
    }
    // Handle Neo4j temporal types
    if (obj instanceof neo4j_driver_1.default.types.DateTime ||
        obj instanceof neo4j_driver_1.default.types.Date ||
        obj instanceof neo4j_driver_1.default.types.Time ||
        obj instanceof neo4j_driver_1.default.types.LocalDateTime ||
        obj instanceof neo4j_driver_1.default.types.LocalTime) {
        return obj.toString();
    }
    // Handle Arrays
    if (Array.isArray(obj)) {
        let newArr = null;
        for (let i = 0; i < obj.length; i++) {
            const v = obj[i];
            const t = transformNeo4jIntegers(v);
            if (t !== v && !newArr) {
                newArr = obj.slice(0, i);
            }
            if (newArr) {
                newArr.push(t);
            }
        }
        return newArr || obj;
    }
    // Handle Neo4j Record-like objects
    if (typeof obj.toObject === 'function') {
        return transformNeo4jIntegers(obj.toObject());
    }
    // Avoid recursing into common non-plain objects that won't contain Neo4j Integers
    if (obj instanceof Date || obj instanceof RegExp || (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))) {
        return obj;
    }
    // Handle Plain Objects
    let newObj = null;
    for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
            const v = obj[k];
            const t = transformNeo4jIntegers(v);
            if (t !== v && !newObj) {
                newObj = { ...obj };
            }
            if (newObj) {
                newObj[k] = t;
            }
        }
    }
    return newObj || obj;
}
