export type DemoWorkflowSeed = {
  templateId: string;
  name: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags: string[];
};

export const demoWorkflowSeed: DemoWorkflowSeed[] = [
  {
    templateId: 'template-security-incident',
    name: 'Demo: Credential Stuffing Sweep',
    description:
      'Triage a suspected credential stuffing campaign targeting the partner portal.',
    priority: 'HIGH',
    tags: ['demo', 'credential-stuffing', 'partner'],
  },
  {
    templateId: 'template-fraud-investigation',
    name: 'Demo: Suspicious Payment Cluster',
    description:
      'Investigate anomalous payment relationships and document evidence artifacts.',
    priority: 'MEDIUM',
    tags: ['demo', 'fraud', 'evidence'],
  },
];
