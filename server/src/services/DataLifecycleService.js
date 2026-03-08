"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataLifecycleService = exports.DataLifecycleService = void 0;
const RegionalConfigService_js_1 = require("./RegionalConfigService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class DataLifecycleService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DataLifecycleService.instance) {
            DataLifecycleService.instance = new DataLifecycleService();
        }
        return DataLifecycleService.instance;
    }
    /**
     * Checks if data should be retained based on its age and the country's policy.
     */
    isRetentionCompliant(countryCode, dataCreationDate) {
        const config = RegionalConfigService_js_1.regionalConfigService.getConfig(countryCode);
        const retentionYears = config.privacy.retentionYears;
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);
        return dataCreationDate >= cutoffDate;
    }
    /**
     * Enforces data minimization by checking if optional fields are allowed.
     * Returns a filtered object containing only allowed fields.
     */
    enforceMinimization(countryCode, data, optionalFields) {
        const config = RegionalConfigService_js_1.regionalConfigService.getConfig(countryCode);
        if (!config.privacy.dataMinimization) {
            return data;
        }
        const filteredData = { ...data };
        for (const field of optionalFields) {
            delete filteredData[field];
        }
        return filteredData;
    }
    /**
     * Simulates a scheduled job that checks for expired data.
     * In a real implementation, this would query the DB.
     */
    async checkExpiredData(countryCode) {
        const config = RegionalConfigService_js_1.regionalConfigService.getConfig(countryCode);
        logger_js_1.default.info(`Checking for expired data in ${countryCode} (Retention: ${config.privacy.retentionYears} years)`);
        // Simulate finding expired records
        // In reality: DELETE FROM records WHERE created_at < cutoff AND tenant_country = countryCode
        return 0;
    }
}
exports.DataLifecycleService = DataLifecycleService;
exports.dataLifecycleService = DataLifecycleService.getInstance();
