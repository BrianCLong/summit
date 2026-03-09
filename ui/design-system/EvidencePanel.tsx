import React from 'react';
import { StatusBadge } from './StatusBadge';

export interface EvidenceItem {
  id: string;
  type: 'artifact' | 'log' | 'screenshot' | 'test' | 'metric' | 'citation';
  title: string;
  source: string;
  timestamp: string;
  confidence?: number;
  verified?: boolean;
  content?: string;
}

export interface EvidencePanelProps {
  title?: string;
  evidence: EvidenceItem[];
  onItemClick?: (item: EvidenceItem) => void;
  className?: string;
}

const typeIcons: Record<string, string> = {
  artifact: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  log: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  screenshot: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  test: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  metric: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  citation: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
};

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ title = 'Evidence', evidence, onItemClick, className = '' }) => {
  return (
    <div className={`bg-bg-surface border border-border-default rounded-lg ${className}`}>
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
        <span className="text-xs text-fg-tertiary">{evidence.length} items</span>
      </div>
      <div className="divide-y divide-border-muted">
        {evidence.map((item) => (
          <div
            key={item.id}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
            className={`px-4 py-3 flex items-start gap-3 ${onItemClick ? 'cursor-pointer hover:bg-bg-surfaceHover' : ''} transition-colors`}
          >
            <svg className="w-4 h-4 text-fg-tertiary mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[item.type] || typeIcons.artifact} />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-fg-primary font-medium truncate">{item.title}</span>
                {item.verified && <StatusBadge status="success" label="Verified" size="sm" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-fg-tertiary">{item.source}</span>
                <span className="text-xs text-fg-muted">{item.timestamp}</span>
                {item.confidence !== undefined && (
                  <span className="text-xs text-fg-tertiary">{Math.round(item.confidence * 100)}% confidence</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
