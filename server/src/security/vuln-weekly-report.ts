import fs from 'node:fs/promises';
import path from 'node:path';

import logger from '../utils/logger.js';
import {
  getAirGapVulnManager,
  initializeAirGapVulnManager,
} from './airgap-vuln-manager.js';
import { createVulnerabilityPolicyManager } from './vulnerability-policy.js';

const REPORT_DIR = process.env.SECURITY_REPORT_DIR || 'reports/security';

export interface WeeklyVulnReport {
  generatedAt: string;
  horizonDays: number;
  summary: {
    criticalOpen: number;
    highOpen: number;
    totalVulnerabilities: number;
    policyPassRate: number;
    lastScanTime?: string;
  };
  trend: Array<{ date: string; critical: number; high: number; medium: number; low: number }>;
  exceptions: {
    active: number;
    expiringSoon: Array<{ cve: string; service: string; owner: string; expiresOn: string }>;
    expired: number;
  };
}

export async function generateOrgVulnerabilityReport(): Promise<{
  reportPath: string;
  payload: WeeklyVulnReport;
}> {
  await initializeAirGapVulnManager();
  const vulnManager = getAirGapVulnManager();
  const dashboard = await vulnManager.getDashboardData();

  const policyManager = createVulnerabilityPolicyManager();
  await policyManager.initialize();
  const waiverHealth = policyManager.getWaiverHealthSummary(21);

  const payload: WeeklyVulnReport = {
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

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const fileName = `vuln-weekly-${payload.generatedAt.split('T')[0]}.json`;
  const reportPath = path.join(REPORT_DIR, fileName);

  await fs.writeFile(reportPath, JSON.stringify(payload, null, 2));

  logger.info('Generated org-level vulnerability weekly report', {
    reportPath,
    critical: payload.summary.criticalOpen,
    expiringExceptions: payload.exceptions.expiringSoon.length,
  });

  return { reportPath, payload };
}
