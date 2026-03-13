import React from 'react';
import { Timeline, type TimelineEvent } from '../design-system/Timeline';
import { Panel } from '../design-system/Panel';
import { StatusBadge } from '../design-system/StatusBadge';
import { MetricCard } from '../design-system/MetricCard';

export interface Campaign {
  id: string;
  name: string;
  actor: string;
  status: 'active' | 'dormant' | 'concluded';
  phase: string;
  startDate: string;
  lastActivity: string;
  targets: number;
  indicators: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CampaignTimelineProps {
  campaigns?: Campaign[];
  onCampaignSelect?: (campaignId: string) => void;
}

export const CampaignTimeline: React.FC<CampaignTimelineProps> = ({ campaigns = [], onCampaignSelect }) => {
  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'error', dormant: 'warning', concluded: 'neutral',
  };
  const severityMap: Record<string, TimelineEvent['type']> = {
    low: 'info', medium: 'warning', high: 'error', critical: 'error',
  };

  const events: TimelineEvent[] = campaigns.map((c) => ({
    id: c.id,
    timestamp: c.lastActivity,
    title: c.name,
    description: `Actor: ${c.actor} · Phase: ${c.phase} · ${c.targets} targets`,
    type: severityMap[c.severity],
    metadata: {
      status: c.status,
      indicators: String(c.indicators),
    },
  }));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-fg-primary">Campaign Timeline</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Active Campaigns" value={campaigns.filter((c) => c.status === 'active').length} status="error" />
        <MetricCard label="Dormant" value={campaigns.filter((c) => c.status === 'dormant').length} status="warning" />
        <MetricCard label="Total Targets" value={campaigns.reduce((a, c) => a + c.targets, 0)} status="neutral" />
        <MetricCard label="Total Indicators" value={campaigns.reduce((a, c) => a + c.indicators, 0)} status="info" />
      </div>

      {/* Timeline chart */}
      <Panel title="Campaign Activity" noPadding>
        <div className="h-48 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Campaign Gantt chart — shows duration, phases, and overlapping campaigns
        </div>
      </Panel>

      <Timeline events={events} />
    </div>
  );
};
