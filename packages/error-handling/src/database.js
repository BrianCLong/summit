"use strict";
/**
 * Database operation wrappers with integrated resilience patterns
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNeo4jQuery = executeNeo4jQuery;
exports.executePostgresQuery = executePostgresQuery;
exports.executeRedisOperation = executeRedisOperation;
exports.withDatabaseTransaction = withDatabaseTransaction;
exports.executeBatchOperation = executeBatchOperation;
const pino_1 = __importDefault(require("pino"));
const errors_js_1 = require("./errors.js");
const resilience_js_1 = require("./resilience.js");
const logger = (0, pino_1.default)({ name: 'DatabaseResilience' });
/**
 * Execute Neo4j query with retry and timeout
 */
async function executeNeo4jQuery(operation, fn, options) {
    const timeoutMs = options?.timeoutMs || 30000;
    const retryable = options?.retryable !== false;
    try {
        const fnWithTimeout = () => (0, resilience_js_1.executeWithTimeout)(fn, timeoutMs, `neo4j.${operation}`);
        if (retryable) {
            return await (0, resilience_js_1.executeWithRetry)(fnWithTimeout, resilience_js_1.RetryPolicies.database, {
                operation,
                service: 'neo4j',
            });
        }
        return await fnWithTimeout();
    }
    catch (error) {
        logger.error({
            operation,
            error: error instanceof Error ? error.message : String(error),
        }, 'Neo4j query failed');
        throw new errors_js_1.DatabaseError('NEO4J_ERROR', `Neo4j ${operation} failed: ${error.message}`, { operation }, error);
    }
}
/**
 * Execute PostgreSQL query with retry and timeout
 */
async function executePostgresQuery(operation, fn, options) {
    const timeoutMs = options?.timeoutMs || 10000;
    const retryable = options?.retryable !== false;
    try {
        const fnWithTimeout = () => (0, resilience_js_1.executeWithTimeout)(fn, timeoutMs, `postgres.${operation}`);
        if (retryable) {
            return await (0, resilience_js_1.executeWithRetry)(fnWithTimeout, resilience_js_1.RetryPolicies.database, {
                operation,
                service: 'postgres',
            });
        }
        return await fnWithTimeout();
    }
    catch (error) {
        logger.error({
            operation,
            error: error instanceof Error ? error.message : String(error),
        }, 'PostgreSQL query failed');
        throw new errors_js_1.DatabaseError('POSTGRES_ERROR', `PostgreSQL ${operation} failed: ${error.message}`, { operation }, error);
    }
}
/**
 * Execute Redis operation with graceful degradation
 * Redis failures should not break the application
 */
async function executeRedisOperation(operation, fn, fallback) {
    return (0, resilience_js_1.withGracefulDegradation)(fn, fallback, {
        serviceName: 'redis',
        operation,
        logError: true,
    });
}
/**
 * Database transaction wrapper with rollback on error
 */
async function withDatabaseTransaction(beginFn, commitFn, rollbackFn, transactionFn) {
    try {
        await beginFn();
        const result = await transactionFn();
        await commitFn();
        return result;
    }
    catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : String(error),
        }, 'Transaction failed, rolling back');
        try {
            await rollbackFn();
        }
        catch (rollbackError) {
            logger.error({
                error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            }, 'Transaction rollback failed');
        }
        throw (0, errors_js_1.toAppError)(error);
    }
}
/**
 * Batch operation with partial failure handling
 */
async function executeBatchOperation(items, operation, options) {
    const continueOnError = options?.continueOnError !== false;
    const batchSize = options?.batchSize || items.length;
    const results = [];
    const errors = [];
    // Process in batches
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(async (item) => {
            try {
                const result = await operation(item);
                results.push(result);
                return { success: true, result };
            }
            catch (error) {
                const appError = (0, errors_js_1.toAppError)(error);
                errors.push({ item, error: appError });
                if (!continueOnError) {
                    throw appError;
                }
                return { success: false, error: appError };
            }
        });
        await Promise.all(batchPromises);
    }
    if (errors.length > 0) {
        logger.warn({
            total: items.length,
            successful: results.length,
            failed: errors.length,
        }, 'Batch operation completed with errors');
    }
    return { results, errors };
}
