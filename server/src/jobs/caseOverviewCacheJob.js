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
exports.scheduleCaseOverviewCacheRefresh = scheduleCaseOverviewCacheRefresh;
const cron = __importStar(require("node-cron"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const CaseOverviewService_js_1 = require("../cases/overview/CaseOverviewService.js");
function scheduleCaseOverviewCacheRefresh(pg, cronExpression = '*/5 * * * *', batchSize = 100) {
    const service = new CaseOverviewService_js_1.CaseOverviewService(pg);
    const task = cron.schedule(cronExpression, async () => {
        try {
            const refreshed = await service.refreshStale(batchSize);
            logger_js_1.default.info({ refreshed, cronExpression, batchSize }, 'Refreshed stale case overview cache entries');
        }
        catch (error) {
            logger_js_1.default.error({ error }, 'Failed to refresh case overview cache');
        }
    });
    logger_js_1.default.info({ cronExpression }, 'Scheduled case overview cache refresh job');
    return task;
}
