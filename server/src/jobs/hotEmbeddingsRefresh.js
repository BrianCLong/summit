"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTenantHotEmbeddings = refreshTenantHotEmbeddings;
exports.startTenantHotEmbeddingsRefresh = startTenantHotEmbeddingsRefresh;
exports.stopTenantHotEmbeddingsRefresh = stopTenantHotEmbeddingsRefresh;
// @ts-nocheck
const pino_1 = __importDefault(require("pino"));
const postgres_js_1 = require("../db/postgres.js");
const metrics_js_1 = require("../monitoring/metrics.js");
const logger = pino_1.default({ name: 'hot-embeddings-refresh' });
let refreshTimer = null;
const DEFAULT_REFRESH_MS = 5 * 60 * 1000;
const DEFAULT_WINDOW = process.env.HOT_EMBEDDINGS_WINDOW ?? '3 days';
const DEFAULT_LIMIT = parseInt(process.env.HOT_EMBEDDINGS_PER_TENANT ?? '500', 10);
const HOT_REFRESH_LIMIT = Number.isFinite(DEFAULT_LIMIT) ? DEFAULT_LIMIT : 500;
const DEFAULT_INTERVAL_MS = parseInt(process.env.HOT_EMBEDDINGS_REFRESH_MS ?? `${DEFAULT_REFRESH_MS}`, 10);
const REFRESH_INTERVAL_MS = Number.isFinite(DEFAULT_INTERVAL_MS)
    ? DEFAULT_INTERVAL_MS
    : DEFAULT_REFRESH_MS;
const ALL_TENANTS_LABEL = 'all-tenants';
async function refreshTenantHotEmbeddings() {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const start = Date.now();
    const stopTimer = metrics_js_1.vectorQueryDurationSeconds.startTimer({
        operation: 'hot-embeddings-refresh',
        tenant_id: ALL_TENANTS_LABEL,
    });
    try {
        await pool.query('SELECT refresh_tenant_hot_entity_embeddings($1::interval, $2);', [DEFAULT_WINDOW, HOT_REFRESH_LIMIT]);
        metrics_js_1.vectorQueriesTotal
            .labels('hot-embeddings-refresh', ALL_TENANTS_LABEL, 'success')
            .inc();
        logger.debug({
            durationMs: Date.now() - start,
            window: DEFAULT_WINDOW,
            perTenant: HOT_REFRESH_LIMIT,
        }, 'refreshed hot embeddings MV');
    }
    catch (error) {
        metrics_js_1.vectorQueriesTotal
            .labels('hot-embeddings-refresh', ALL_TENANTS_LABEL, 'error')
            .inc();
        throw error;
    }
    finally {
        stopTimer();
    }
}
function startTenantHotEmbeddingsRefresh(intervalMs = REFRESH_INTERVAL_MS) {
    if (refreshTimer)
        return;
    const runRefresh = async () => {
        try {
            await refreshTenantHotEmbeddings();
        }
        catch (error) {
            logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'failed to refresh hot embeddings MV');
        }
    };
    void runRefresh();
    refreshTimer = setInterval(runRefresh, intervalMs);
    logger.info({ intervalMs }, 'started hot embeddings refresh loop');
}
function stopTenantHotEmbeddingsRefresh() {
    if (!refreshTimer)
        return;
    clearInterval(refreshTimer);
    refreshTimer = null;
    logger.info('stopped hot embeddings refresh loop');
}
