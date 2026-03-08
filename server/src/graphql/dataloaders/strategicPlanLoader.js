"use strict";
// @ts-nocheck
/**
 * Strategic Plan DataLoader
 *
 * Batch loading for strategic plans to prevent N+1 query problems.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStrategicPlanLoader = createStrategicPlanLoader;
exports.createStrategicPlanningLoaders = createStrategicPlanningLoaders;
const dataloader_1 = __importDefault(require("dataloader"));
const database_js_1 = require("../../config/database.js");
const StrategicPlanningService_js_1 = require("../../services/StrategicPlanningService.js");
/**
 * Create a DataLoader for batching strategic plan queries
 */
function createStrategicPlanLoader(context) {
    return new dataloader_1.default(async (ids) => {
        const pool = (0, database_js_1.getPostgresPool)();
        const service = (0, StrategicPlanningService_js_1.getStrategicPlanningService)(pool);
        const plans = await service.batchLoadPlans(ids, context.tenantId);
        // DataLoader requires results in same order as input ids
        const planMap = new Map(plans
            .filter((p) => p !== null)
            .map((p) => [p.id, p]));
        return ids.map((id) => planMap.get(id) || null);
    }, {
        // Cache the results for the duration of the request
        cache: true,
        // Batch window in milliseconds
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * Create all strategic planning related loaders
 */
function createStrategicPlanningLoaders(context) {
    return {
        strategicPlanLoader: createStrategicPlanLoader(context),
    };
}
