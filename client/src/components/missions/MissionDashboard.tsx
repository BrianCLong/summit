import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Mission, Severity } from '@/types/intelligence-os';
import { MissionTimeline } from './MissionTimeline';
import { MissionEntities } from './MissionEntities';
import { MissionStatus } from './MissionStatus';

// ---------------------------------------------------------------------------
// MissionDashboard — strategic mission coordination view
// ---------------------------------------------------------------------------

export interface MissionDashboardProps extends React.HTMLAttributes<HTMLDivElement> {
  mission: Mission;
  activeTab?: 'status' | 'timeline' | 'entities';
  onTabChange?: (tab: 'status' | 'timeline' | 'entities') => void;
  onInvestigationSelect?: (investigationId: string) => void;
}

const PRIORITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  info: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

const STATUS_STYLES: Record<Mission['status'], string> = {
  planning: 'bg-purple-500/10 text-purple-400',
  active: 'bg-green-500/10 text-green-400',
  monitoring: 'bg-cyan-500/10 text-cyan-400',
  completed: 'bg-zinc-500/10 text-zinc-400',
  archived: 'bg-zinc-500/10 text-zinc-500',
};

const TABS = ['status', 'timeline', 'entities'] as const;

const MissionDashboard = React.forwardRef<HTMLDivElement, MissionDashboardProps>(
  ({ className, mission, activeTab = 'status', onTabChange, onInvestigationSelect, ...props }, ref) => {
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
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">{mission.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{mission.objective}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-xs', PRIORITY_STYLES[mission.priority])}>
                {mission.priority}
              </Badge>
              <Badge className={cn('text-xs capitalize', STATUS_STYLES[mission.status])}>
                {mission.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{mission.investigationIds.length} investigations</span>
            <span>{mission.agentIds.length} agents</span>
            <span>{mission.analysts.length} analysts</span>
            <span>{mission.threatIndicatorIds.length} threat indicators</span>
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

        {/* Panels */}
        {tab === 'status' && <MissionStatus mission={mission} />}
        {tab === 'timeline' && <MissionTimeline milestones={mission.timeline} />}
        {tab === 'entities' && (
          <MissionEntities
            mission={mission}
            onInvestigationSelect={onInvestigationSelect}
          />
        )}
      </div>
    );
  },
);
MissionDashboard.displayName = 'MissionDashboard';

export { MissionDashboard };
