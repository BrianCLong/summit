"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrgVulnerabilityReport = generateOrgVulnerabilityReport;
// @ts-nocheck
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const airgap_vuln_manager_js_1 = require("./airgap-vuln-manager.js");
const vulnerability_policy_js_1 = require("./vulnerability-policy.js");
const REPORT_DIR = process.env.SECURITY_REPORT_DIR || 'reports/security';
async function generateOrgVulnerabilityReport() {
    await (0, airgap_vuln_manager_js_1.initializeAirGapVulnManager)();
    const vulnManager = (0, airgap_vuln_manager_js_1.getAirGapVulnManager)();
    const dashboard = await vulnManager.getDashboardData();
    const policyManager = (0, vulnerability_policy_js_1.createVulnerabilityPolicyManager)();
    await policyManager.initialize();
    const waiverHealth = policyManager.getWaiverHealthSummary(21);
    const payload = {
        generatedAt: new Date().toISOString(),
        horizonDays: 30,
        summary: {
            criticalOpen: dashboard.summary.criticalCount,
            highOpen: dashboard.summary.highCount,
            totalVulnerabilities: dashboard.summary.totalVulnerabilities,
            policyPassRate: dashboard.summary.policyPassRate,
            lastScanTime: dashboard.summary.lastScanTime,
        },
        trend: dashboard.trendData,
        exceptions: {
            active: waiverHealth.active.length,
            expiringSoon: waiverHealth.expiring.map((waiver) => ({
                cve: waiver.cve_id,
                service: waiver.service,
                owner: waiver.approved_by,
                expiresOn: waiver.expiry_date,
            })),
            expired: waiverHealth.expired.length,
        },
    };
    await promises_1.default.mkdir(REPORT_DIR, { recursive: true });
    const fileName = `vuln-weekly-${payload.generatedAt.split('T')[0]}.json`;
    const reportPath = node_path_1.default.join(REPORT_DIR, fileName);
    await promises_1.default.writeFile(reportPath, JSON.stringify(payload, null, 2));
    logger_js_1.default.info('Generated org-level vulnerability weekly report', {
        reportPath,
        critical: payload.summary.criticalOpen,
        expiringExceptions: payload.exceptions.expiringSoon.length,
    });
    return { reportPath, payload };
}
