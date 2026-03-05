import { ReportFormat, ReportTemplate } from './types.js';

export type ReportType =
  | 'approval-risk'
  | 'incident-evidence-manifest'
  | 'policy-coverage';

export const reportTemplates: Record<ReportType, Record<ReportFormat, ReportTemplate>> =
  {
    'approval-risk': {
      json: {
        id: 'approval-risk-json',
        name: 'Approval & Risk Report',
        description: 'Approval and risk metrics by tenant and time window.',
        content: '{{ payload | safe }}',
        format: 'json',
      },
      pdf: {
        id: 'approval-risk-pdf',
        name: 'Approval & Risk Report',
        description: 'Approval and risk metrics by tenant and time window.',
        content: `
          <h1>Approval & Risk Report</h1>
          <p>Tenant: {{ report.tenantName or report.tenantId }}</p>
          <p>Window: {{ report.window.start | as_date }} - {{ report.window.end | as_date }}</p>
          <h2>Summary</h2>
          <p>Total approvals: {{ report.data.approvals }}</p>
          <p>Total denials: {{ report.data.denials }}</p>
          <p>Average cycle time (hours): {{ report.data.cycleTimeHours }}</p>
          <h2>Deny Reasons</h2>
          <ul>
            {% for reason in report.data.denyReasons %}
              <li>{{ reason }}</li>
            {% endfor %}
          </ul>
        `,
        format: 'pdf',
      },
    },
    'incident-evidence-manifest': {
      json: {
        id: 'incident-evidence-json',
        name: 'Incident Evidence Manifest',
        description: 'Evidence manifest with receipts, hashes, and signatures.',
        content: '{{ payload | safe }}',
        format: 'json',
      },
      pdf: {
        id: 'incident-evidence-pdf',
        name: 'Incident Evidence Manifest',
        description: 'Evidence manifest with receipts, hashes, and signatures.',
        content: `
          <h1>Incident Evidence Manifest</h1>
          <p>Incident: {{ report.data.incidentId }}</p>
          <p>Tenant: {{ report.tenantName or report.tenantId }}</p>
          <h2>Receipts</h2>
          <ul>
            {% for receipt in report.data.receipts %}
              <li>{{ receipt }}</li>
            {% endfor %}
          </ul>
          <h2>Hashes</h2>
          <ul>
            {% for hash in report.data.hashes %}
              <li>{{ hash }}</li>
            {% endfor %}
          </ul>
        `,
        format: 'pdf',
      },
    },
    'policy-coverage': {
      json: {
        id: 'policy-coverage-json',
        name: 'Policy Coverage Report',
        description: 'Policy coverage and simulation outcomes.',
        content: '{{ payload | safe }}',
        format: 'json',
      },
      pdf: {
        id: 'policy-coverage-pdf',
        name: 'Policy Coverage Report',
        description: 'Policy coverage and simulation outcomes.',
        content: `
          <h1>Policy Coverage Report</h1>
          <p>Tenant: {{ report.tenantName or report.tenantId }}</p>
          <p>Window: {{ report.window.start | as_date }} - {{ report.window.end | as_date }}</p>
          <h2>Covered Actions</h2>
          <ul>
            {% for action in report.data.coveredActions %}
              <li>{{ action }}</li>
            {% endfor %}
          </ul>
          <h2>Simulations</h2>
          <ul>
            {% for simulation in report.data.simulations %}
              <li>{{ simulation }}</li>
            {% endfor %}
          </ul>
        `,
        format: 'pdf',
      },
    },
  };

export function getReportTemplate(
  reportType: ReportType,
  format: ReportFormat,
): ReportTemplate {
  const templatesByFormat = reportTemplates[reportType];
  const template = templatesByFormat?.[format];
  if (!template) {
    throw new Error(`Unsupported report template for ${reportType} in ${format}`);
  }
  return template;
}
