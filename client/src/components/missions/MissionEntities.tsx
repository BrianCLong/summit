import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Mission } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// MissionEntities — linked investigations, agents, and threat indicators
// ---------------------------------------------------------------------------

export interface MissionEntitiesProps extends React.HTMLAttributes<HTMLDivElement> {
  mission: Mission;
  onInvestigationSelect?: (investigationId: string) => void;
  onAgentSelect?: (agentId: string) => void;
}

const MissionEntities = React.forwardRef<HTMLDivElement, MissionEntitiesProps>(
  ({ className, mission, onInvestigationSelect, onAgentSelect, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {/* Investigations */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium">
              Investigations ({mission.investigationIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {mission.investigationIds.length === 0 ? (
              <span className="text-xs text-muted-foreground">None linked</span>
            ) : (
              mission.investigationIds.map((id) => (
                <button
                  key={id}
                  onClick={() => onInvestigationSelect?.(id)}
                  className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs text-green-400 hover:bg-green-500/20"
                >
                  {id}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Agents */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium">
              Agents ({mission.agentIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {mission.agentIds.length === 0 ? (
              <span className="text-xs text-muted-foreground">None assigned</span>
            ) : (
              mission.agentIds.map((id) => (
                <button
                  key={id}
                  onClick={() => onAgentSelect?.(id)}
                  className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs text-cyan-400 hover:bg-cyan-500/20"
                >
                  {id}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Analysts */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium">
              Analysts ({mission.analysts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mission.analysts.length === 0 ? (
              <span className="text-xs text-muted-foreground">None assigned</span>
            ) : (
              <div className="flex flex-col gap-1">
                {mission.analysts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.role}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Threat indicators */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium">
              Threat Indicators ({mission.threatIndicatorIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {mission.threatIndicatorIds.length === 0 ? (
              <span className="text-xs text-muted-foreground">None tracked</span>
            ) : (
              mission.threatIndicatorIds.map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400"
                >
                  {id}
                </span>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
);
MissionEntities.displayName = 'MissionEntities';

export { MissionEntities };
