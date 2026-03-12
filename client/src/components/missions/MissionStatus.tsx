import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Mission } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// MissionStatus — summary health / progress view for a mission
// ---------------------------------------------------------------------------

export interface MissionStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  mission: Mission;
}

const MissionStatus = React.forwardRef<HTMLDivElement, MissionStatusProps>(
  ({ className, mission, ...props }, ref) => {
    const milestoneProgress = React.useMemo(() => {
      if (mission.timeline.length === 0) return 0;
      const completed = mission.timeline.filter((m) => m.status === 'completed').length;
      return Math.round((completed / mission.timeline.length) * 100);
    }, [mission.timeline]);

    const stats = [
      { label: 'Investigations', value: mission.investigationIds.length },
      { label: 'Active Agents', value: mission.agentIds.length },
      { label: 'Analysts', value: mission.analysts.length },
      { label: 'Threat Indicators', value: mission.threatIndicatorIds.length },
      { label: 'Simulations', value: mission.simulationIds.length },
    ];

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {/* Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mission Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={milestoneProgress} className="h-2" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {mission.timeline.filter((m) => m.status === 'completed').length} /{' '}
                {mission.timeline.length} milestones
              </span>
              <span>{milestoneProgress}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <span className="text-2xl font-bold">{s.value}</span>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Created: {new Date(mission.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(mission.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    );
  },
);
MissionStatus.displayName = 'MissionStatus';

export { MissionStatus };
