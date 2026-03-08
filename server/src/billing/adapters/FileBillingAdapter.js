"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileBillingAdapter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// @ts-expect-error - json2csv may not have types
const json2csv_1 = require("json2csv");
const logger_js_1 = require("../../config/logger.js");
class FileBillingAdapter {
    name = 'file-adapter';
    exportPath;
    constructor(exportPath = 'exports/billing') {
        this.exportPath = exportPath;
        if (!fs_1.default.existsSync(this.exportPath)) {
            fs_1.default.mkdirSync(this.exportPath, { recursive: true });
        }
    }
    async exportUsage(report) {
        try {
            const csv = (0, json2csv_1.parse)([report], {
                fields: [
                    'tenantId',
                    'periodStart',
                    'periodEnd',
                    'apiCalls',
                    'ingestEvents',
                    'egressGb',
                    'plan',
                    'quotaOverrides',
                    'signature'
                ]
            });
            const dateStr = report.periodStart.toISOString().split('T')[0];
            const filename = `${report.tenantId}_${dateStr}.csv`;
            const filePath = path_1.default.join(this.exportPath, filename);
            fs_1.default.writeFileSync(filePath, csv);
            logger_js_1.logger.info({ tenantId: report.tenantId, filePath }, 'Usage report exported to file');
        }
        catch (error) {
            logger_js_1.logger.error({ err: error, tenantId: report.tenantId }, 'Failed to export usage report to file');
            throw error;
        }
    }
    async getBilledUsage(tenantId, periodStart, periodEnd) {
        // This is a naive implementation that expects a file to exist for the start date
        const dateStr = periodStart.toISOString().split('T')[0];
        const filename = `${tenantId}_${dateStr}.csv`;
        const filePath = path_1.default.join(this.exportPath, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return null;
        }
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf-8');
            // Simple CSV parsing assuming header + 1 line
            const lines = content.trim().split('\n');
            if (lines.length < 2)
                return null;
            const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
            const values = lines[1].split(',').map((v) => v.replace(/"/g, ''));
            const report = {};
            headers.forEach((h, i) => {
                report[h] = values[i];
            });
            // Type conversion
            return {
                tenantId: report.tenantId,
                periodStart: new Date(report.periodStart),
                periodEnd: new Date(report.periodEnd),
                apiCalls: parseInt(report.apiCalls),
                ingestEvents: parseInt(report.ingestEvents),
                egressGb: parseFloat(report.egressGb),
                plan: report.plan,
                quotaOverrides: report.quotaOverrides,
                signature: report.signature
            };
        }
        catch (error) {
            logger_js_1.logger.error({ err: error, tenantId }, 'Failed to read billed usage');
            return null;
        }
    }
}
exports.FileBillingAdapter = FileBillingAdapter;
