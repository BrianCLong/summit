import React from 'react';
import { Card } from '../design-system/Card';
import { StatusBadge } from '../design-system/StatusBadge';
import { Button } from '../design-system/Button';

export interface EntityProperty {
  key: string;
  value: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'json';
}

export interface EntityRelationship {
  id: string;
  type: string;
  direction: 'inbound' | 'outbound';
  targetLabel: string;
  targetType: string;
  weight?: number;
}

export interface EntityPanelProps {
  entity?: {
    id: string;
    label: string;
    type: string;
    properties: EntityProperty[];
    relationships: EntityRelationship[];
    riskScore?: number;
    lastUpdated?: string;
  };
  onRelationshipClick?: (relationshipId: string) => void;
  onInvestigate?: (entityId: string) => void;
}

export const EntityPanel: React.FC<EntityPanelProps> = ({ entity, onRelationshipClick, onInvestigate }) => {
  if (!entity) {
    return (
      <div className="p-6 text-center text-fg-tertiary">
        <p className="text-sm">Select an entity to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Entity header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-fg-primary">{entity.label}</h2>
          <StatusBadge status="info" label={entity.type} />
        </div>
        <p className="text-xs text-fg-tertiary font-mono">{entity.id}</p>
        {entity.lastUpdated && <p className="text-xs text-fg-tertiary mt-1">Updated {entity.lastUpdated}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onInvestigate?.(entity.id)}>Investigate</Button>
        <Button variant="secondary" size="sm">Expand Graph</Button>
        <Button variant="ghost" size="sm">Pin</Button>
      </div>

      {/* Risk score */}
      {entity.riskScore !== undefined && (
        <Card variant="outlined" padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg-secondary">Risk Score</span>
            <span className={`text-lg font-bold ${entity.riskScore > 70 ? 'text-semantic-error' : entity.riskScore > 40 ? 'text-semantic-warning' : 'text-semantic-success'}`}>
              {entity.riskScore}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${entity.riskScore > 70 ? 'bg-semantic-error' : entity.riskScore > 40 ? 'bg-semantic-warning' : 'bg-semantic-success'}`}
              style={{ width: `${entity.riskScore}%` }}
            />
          </div>
        </Card>
      )}

      {/* Properties */}
      <Card header={<span className="text-xs font-semibold text-fg-secondary uppercase">Properties</span>} padding="none">
        <div className="divide-y divide-border-muted">
          {entity.properties.map((prop) => (
            <div key={prop.key} className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-fg-secondary">{prop.key}</span>
              <span className="text-xs text-fg-primary font-mono max-w-[200px] truncate">{prop.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Relationships */}
      <Card header={<span className="text-xs font-semibold text-fg-secondary uppercase">Relationships ({entity.relationships.length})</span>} padding="none">
        <div className="divide-y divide-border-muted">
          {entity.relationships.map((rel) => (
            <button
              key={rel.id}
              onClick={() => onRelationshipClick?.(rel.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-surfaceHover transition-colors text-left"
            >
              <span className={`text-2xs ${rel.direction === 'inbound' ? 'text-semantic-info' : 'text-semantic-success'}`}>
                {rel.direction === 'inbound' ? '←' : '→'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-fg-primary truncate">{rel.targetLabel}</p>
                <p className="text-2xs text-fg-tertiary">{rel.type} · {rel.targetType}</p>
              </div>
              {rel.weight !== undefined && (
                <span className="text-2xs text-fg-muted">{rel.weight.toFixed(2)}</span>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
