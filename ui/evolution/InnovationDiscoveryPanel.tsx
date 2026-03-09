import React from 'react';
import { Card } from '../design-system/Card';
import { StatusBadge } from '../design-system/StatusBadge';
import { Button } from '../design-system/Button';
import { MetricCard } from '../design-system/MetricCard';

export interface Innovation {
  id: string;
  title: string;
  category: 'pattern' | 'technique' | 'framework' | 'algorithm';
  discoveredIn: string;
  significance: 'low' | 'medium' | 'high' | 'breakthrough';
  description: string;
  relatedEntities: string[];
  discoveryDate: string;
}

export interface InnovationDiscoveryPanelProps {
  innovations?: Innovation[];
  onInnovationSelect?: (innovationId: string) => void;
  onRunDiscovery?: () => void;
}

export const InnovationDiscoveryPanel: React.FC<InnovationDiscoveryPanelProps> = ({ innovations = [], onInnovationSelect, onRunDiscovery }) => {
  const significanceColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    low: 'info', medium: 'success', high: 'warning', breakthrough: 'error',
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Innovation Discovery</h1>
        <Button size="sm" onClick={onRunDiscovery}>Run Discovery</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Innovations" value={innovations.length} status="neutral" />
        <MetricCard label="Breakthroughs" value={innovations.filter((i) => i.significance === 'breakthrough').length} status="error" />
        <MetricCard label="New Patterns" value={innovations.filter((i) => i.category === 'pattern').length} status="info" />
        <MetricCard label="New Techniques" value={innovations.filter((i) => i.category === 'technique').length} status="success" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {innovations.map((innovation) => (
          <Card
            key={innovation.id}
            variant="interactive"
            padding="md"
            onClick={() => onInnovationSelect?.(innovation.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={significanceColors[innovation.significance]} label={innovation.significance} />
              <StatusBadge status="neutral" label={innovation.category} dot={false} />
            </div>
            <h3 className="text-sm font-semibold text-fg-primary mb-1">{innovation.title}</h3>
            <p className="text-xs text-fg-secondary line-clamp-2">{innovation.description}</p>
            <div className="flex items-center gap-2 mt-3 text-2xs text-fg-tertiary">
              <span>Found in: {innovation.discoveredIn}</span>
              <span>{innovation.discoveryDate}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
