import * as fs from 'fs';
import * as path from 'path';

interface ExceptionEntry {
  exception_id: string;
  type: string;
  owner: string;
  created_at?: string;
  expires_at: string;
  scope: string;
  bindings: {
    policy_bundle_hash?: string;
    evidence_hashes?: string[];
  };
  status: 'ACTIVE' | 'WARNING' | 'OVERDUE' | 'VIOLATION' | 'CLOSED';
  rationale: string;
}

interface SunsetReport {
  generated_at: string;
  summary: {
    total: number;
    active: number;
    warning: number;
    overdue: number;
    violation: number;
    closed: number;
  };
  expiring_soon: ExceptionEntry[]; // Next 14 days
  violations: ExceptionEntry[];
  action_items: {
    id: string;
    action: string;
    owner: string;
  }[];
}

const main = () => {
  const exceptionsPath = 'dist/exceptions/exceptions.json';
  const reportJsonPath = 'dist/exceptions/sunset-report.json';
  const reportMdPath = 'dist/exceptions/sunset-report.md';

  if (!fs.existsSync(exceptionsPath)) {
    console.error(`Exceptions file not found at ${exceptionsPath}`);
    process.exit(1);
  }

  const exceptions: ExceptionEntry[] = JSON.parse(fs.readFileSync(exceptionsPath, 'utf8'));
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);

  const report: SunsetReport = {
    generated_at: now.toISOString(),
    summary: {
      total: exceptions.length,
      active: 0,
      warning: 0,
      overdue: 0,
      violation: 0,
      closed: 0,
    },
    expiring_soon: [],
    violations: [],
    action_items: [],
  };

  exceptions.forEach(ex => {
    // Update Counts
    switch (ex.status) {
        case 'ACTIVE': report.summary.active++; break;
        case 'WARNING': report.summary.warning++; break;
        case 'OVERDUE': report.summary.overdue++; break;
        case 'VIOLATION': report.summary.violation++; break;
        case 'CLOSED': report.summary.closed++; break;
    }

    // Check Expiring Soon (if Active or Warning)
    if (['ACTIVE', 'WARNING'].includes(ex.status)) {
        const expiry = new Date(ex.expires_at);
        if (expiry <= soon) {
            report.expiring_soon.push(ex);
        }
    }

    // Violations
    if (['VIOLATION', 'OVERDUE'].includes(ex.status)) {
        report.violations.push(ex);
        report.action_items.push({
            id: ex.exception_id,
            action: ex.status === 'VIOLATION' ? 'IMMEDIATE CLOSURE REQUIRED' : 'RENEW OR CLOSE',
            owner: ex.owner
        });
    }
  });

  // Write JSON Report
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));

  // Write Markdown Report
  const mdContent = `
# Exception Sunset Report
**Generated:** ${now.toISOString()}

## Summary
| Status | Count |
| :--- | :--- |
| **VIOLATION** | 🔴 **${report.summary.violation}** |
| **OVERDUE** | 🟠 **${report.summary.overdue}** |
| WARNING | 🟡 ${report.summary.warning} |
| ACTIVE | 🟢 ${report.summary.active} |
| CLOSED | ⚪ ${report.summary.closed} |
| **Total** | **${report.summary.total}** |

## 🚨 Violations & Overdue (Action Required)
${report.violations.length === 0 ? '_None._' : ''}
| ID | Type | Owner | Status | Expires | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
${report.violations.map(v => `| ${v.exception_id} | ${v.type} | ${v.owner} | **${v.status}** | ${v.expires_at.split('T')[0]} | \`${v.scope}\` |`).join('\n')}

## ⏳ Expiring Soon (Next 14 Days)
${report.expiring_soon.length === 0 ? '_None._' : ''}
| ID | Type | Owner | Expires | Rationale |
| :--- | :--- | :--- | :--- | :--- |
${report.expiring_soon.map(v => `| ${v.exception_id} | ${v.type} | ${v.owner} | ${v.expires_at.split('T')[0]} | ${v.rationale} |`).join('\n')}

## Closure Checklist
To resolve a violation or overdue exception:
1. **Close:** Remove the entry from the source file if the need has passed.
2. **Renew:** Create a *new* decision log entry or break-glass override with a fresh rationale and timestamp if it is still required.
3. **Verify:** Run \`npx tsx scripts/reporting/collect_exceptions.ts\` to update the registry.
`;

  fs.writeFileSync(reportMdPath, mdContent.trim());
  console.log(`Generated reports: ${reportJsonPath}, ${reportMdPath}`);
};

main();
