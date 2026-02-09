import { DrillScenario } from './types';

export const defaultScenario: DrillScenario = {
  name: 'Day-0 → Day-30 Privacy Incident Drill',
  description:
    'Comprehensive simulation covering initial detection through post-incident reporting over the first 30 days.',
  startDate: new Date('2025-01-02T14:00:00Z'),
  durationDays: 30,
  slaTargets: {
    regulatorResponseHours: 24,
    customerNotificationHours: 72,
    artifactFulfillmentHours: 36,
  },
  events: [
    {
      id: 'trigger-breach-detection',
      type: 'trigger',
      title: 'Day-0 Breach Detection',
      dayOffset: 0,
      summary:
        'Security analytics flags anomalous access to customer profile data.',
      severity: 'high',
    },
    {
      id: 'fact-compromised-segments',
      type: 'fact',
      title: 'Compromised Segments Identified',
      dayOffset: 0.5,
      summary:
        'Investigation confirms exposure limited to marketing cohort export service.',
      detail:
        'Roughly 18,000 records potentially accessed via misconfigured partner integration.',
    },
    {
      id: 'regulator-query-1',
      type: 'regulator_query',
      title: 'Regulator Clarification Request',
      dayOffset: 1,
      summary:
        'Regional regulator inquires about incident scope and containment timeline.',
      regulator: 'EU DPA',
      query:
        'Provide authoritative impact assessment, containment steps, and affected residency breakdown.',
      dueInHours: 24,
      targetResponseHours: 26,
      variabilityHours: 1,
    },
    {
      id: 'customer-comm-1',
      type: 'customer_comm',
      title: 'Customer Notification Draft',
      dayOffset: 2,
      summary:
        'Draft direct-to-consumer messaging covering incident context and support channels.',
      audience: 'Impacted EU customers',
      channel: 'email',
      dueInHours: 72,
      targetResponseHours: 48,
      variabilityHours: 4,
    },
    {
      id: 'artifact-request-access-logs',
      type: 'artifact_request',
      title: 'Access Log Pull',
      dayOffset: 1.5,
      summary:
        'Central privacy office requests consolidated access logs for compromised segments.',
      integration: 'IAB',
      artifactType: 'access_logs',
      evidenceDescription:
        'partner integration account usage between Day-0 and Day-2',
      dueInHours: 18,
      targetResponseHours: 12,
      variabilityHours: 2,
    },
    {
      id: 'artifact-request-transfer-ledger',
      type: 'artifact_request',
      title: 'Transfer Ledger Export',
      dayOffset: 4,
      summary:
        'Regulator mandates a 30-day lookback on downstream data sharing.',
      integration: 'IDTL',
      artifactType: 'transfer_ledger',
      evidenceDescription:
        'all downstream transfers for impacted identities Day-0 to Day-30',
      dueInHours: 24,
      targetResponseHours: 30,
      variabilityHours: 1,
    },
    {
      id: 'fact-remediation-progress',
      type: 'fact',
      title: 'Remediation Milestone',
      dayOffset: 6,
      summary: 'Partner integration patched and retroactive access disabled.',
      detail: 'Engineering patch deployed alongside credential rotation.',
    },
    {
      id: 'customer-comm-final',
      type: 'customer_comm',
      title: 'Final Customer Update',
      dayOffset: 14,
      summary:
        'Follow-up update for affected customers outlining remediation and support steps.',
      audience: 'Impacted EU customers',
      channel: 'status_page',
      dueInHours: 96,
      targetResponseHours: 60,
      variabilityHours: 6,
    },
    {
      id: 'fact-closeout',
      type: 'fact',
      title: 'Closeout Summary',
      dayOffset: 30,
      summary:
        'Incident review board signs off on closure with outstanding actions catalogued.',
      detail:
        'Outstanding actions moved to privacy resiliency backlog for tracking.',
    },
  ],
};
