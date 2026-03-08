"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseOverviewRefreshJob = void 0;
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const CaseOverviewService_js_1 = require("./CaseOverviewService.js");
const CaseOverviewCacheRepo_js_1 = require("../../repos/CaseOverviewCacheRepo.js");
const refreshLogger = logger_js_1.default.child({ name: 'CaseOverviewRefreshJob' });
class CaseOverviewRefreshJob {
    service;
    cacheRepo;
    constructor(pg, options) {
        this.service = new CaseOverviewService_js_1.CaseOverviewService(pg, options);
        this.cacheRepo = new CaseOverviewCacheRepo_js_1.CaseOverviewCacheRepo(pg);
    }
    async run(limit = 50) {
        const candidates = await this.cacheRepo.listCasesNeedingRefresh(limit);
        let refreshed = 0;
        for (const candidate of candidates) {
            try {
                await this.service.refresh(candidate.caseId, candidate.tenantId);
                refreshed += 1;
            }
            catch (error) {
                refreshLogger.warn({ error: error.message, caseId: candidate.caseId, tenantId: candidate.tenantId }, 'Failed to refresh case overview cache entry');
            }
        }
        return { attempted: candidates.length, refreshed };
    }
}
exports.CaseOverviewRefreshJob = CaseOverviewRefreshJob;
