import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InvestigationMemory as InvestigationMemoryType } from '@/types/intelligence-os';
import { MemoryTimeline } from './MemoryTimeline';
import { MemoryGraph } from './MemoryGraph';
import { MemorySearch } from './MemorySearch';
import { MemoryNotes } from './MemoryNotes';

// ---------------------------------------------------------------------------
// InvestigationMemory — root container for a single investigation's memory
// ---------------------------------------------------------------------------

export interface InvestigationMemoryProps extends React.HTMLAttributes<HTMLDivElement> {
  investigation: InvestigationMemoryType;
  activeTab?: 'timeline' | 'graph' | 'search' | 'notes';
  onTabChange?: (tab: 'timeline' | 'graph' | 'search' | 'notes') => void;
  onEntitySelect?: (entityId: string) => void;
}

const STATUS_VARIANT: Record<InvestigationMemoryType['status'], string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  closed: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

const TABS = ['timeline', 'graph', 'search', 'notes'] as const;

const InvestigationMemoryPanel = React.forwardRef<HTMLDivElement, InvestigationMemoryProps>(
  ({ className, investigation, activeTab = 'timeline', onTabChange, onEntitySelect, ...props }, ref) => {
    const [tab, setTab] = React.useState(activeTab);

    const handleTab = React.useCallback(
      (t: typeof tab) => {
        setTab(t);
        onTabChange?.(t);
      },
      [onTabChange],
    );

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">{investigation.title || 'Untitled Investigation'}</CardTitle>
            <Badge className={cn('text-xs', STATUS_VARIANT[investigation.status])}>
              {investigation.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{investigation.entities.length} entities</span>
            <span>{investigation.events.length} events</span>
            <span>{investigation.hypotheses.length} hypotheses</span>
            <span>{investigation.evidence.length} evidence items</span>
          </CardContent>
        </Card>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-md bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => handleTab(t)}
              className={cn(
                'flex-1 rounded-sm px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                t === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Active panel */}
        {tab === 'timeline' && (
          <MemoryTimeline entries={investigation.timeline} onEntrySelect={onEntitySelect} />
        )}
        {tab === 'graph' && (
          <MemoryGraph
            entities={investigation.entities}
            events={investigation.events}
            onEntitySelect={onEntitySelect}
          />
        )}
        {tab === 'search' && <MemorySearch investigation={investigation} onEntitySelect={onEntitySelect} />}
        {tab === 'notes' && <MemoryNotes notes={investigation.analystNotes} />}
      </div>
    );
  },
);
InvestigationMemoryPanel.displayName = 'InvestigationMemoryPanel';

export { InvestigationMemoryPanel };
