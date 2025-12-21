import { v4 as uuid } from 'uuid';

export type StarterTemplate = 'analyst' | 'operator' | 'viewer';

export type StarterDataRecord = {
  id: string;
  template: StarterTemplate;
  title: string;
  sampleInsights: string[];
  createdAt: Date;
};

export class StarterDataService {
  private records = new Map<string, StarterDataRecord>();

  provision(workspaceId: string, template: StarterTemplate): StarterDataRecord {
    const existing = this.records.get(workspaceId);
    if (existing) return existing;

    const record: StarterDataRecord = {
      id: uuid(),
      template,
      title: this.titleFor(template),
      sampleInsights: this.sampleInsightsFor(template),
      createdAt: new Date(),
    };
    this.records.set(workspaceId, record);
    return record;
  }

  get(workspaceId: string): StarterDataRecord | undefined {
    return this.records.get(workspaceId);
  }

  private titleFor(template: StarterTemplate): string {
    switch (template) {
      case 'analyst':
        return 'Analyst Starter Graph';
      case 'operator':
        return 'Operational Readiness Pack';
      case 'viewer':
        return 'Executive Overview Dashboard';
    }
  }

  private sampleInsightsFor(template: StarterTemplate): string[] {
    switch (template) {
      case 'analyst':
        return [
          'Top 5 linked entities by risk score',
          'Emerging relationship clusters',
          'Priority watchlist crossings',
        ];
      case 'operator':
        return [
          'Integration health summary',
          'Failed ingest retry backlog',
          'Policy exceptions requiring approval',
        ];
      case 'viewer':
        return [
          'Week-over-week activation trend',
          'Aha conversion by segment',
          'Current SLA attainment',
        ];
    }
  }
}
