import * as React from 'react';

import { cn } from '@/lib/utils';
import type { MissionMilestone } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// MissionTimeline — milestone-based progress timeline for missions
// ---------------------------------------------------------------------------

export interface MissionTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  milestones: MissionMilestone[];
  onMilestoneSelect?: (milestoneId: string) => void;
}

const STATUS_DOT: Record<MissionMilestone['status'], string> = {
  pending: 'bg-zinc-500',
  in_progress: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
};

const MissionTimeline = React.forwardRef<HTMLDivElement, MissionTimelineProps>(
  ({ className, milestones, onMilestoneSelect, ...props }, ref) => {
    if (milestones.length === 0) {
      return (
        <div ref={ref} className={cn('py-8 text-center text-sm text-muted-foreground', className)} {...props}>
          No milestones defined.
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('relative space-y-3 pl-6', className)} {...props}>
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />

        {milestones.map((ms) => (
          <button
            key={ms.id}
            onClick={() => onMilestoneSelect?.(ms.id)}
            className="relative flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
          >
            <span
              className={cn(
                'absolute -left-3.5 top-3 h-2.5 w-2.5 rounded-full ring-2 ring-background',
                STATUS_DOT[ms.status],
              )}
            />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium">{ms.label}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{ms.status.replace('_', ' ')}</span>
                {ms.dueDate && <span>Due: {new Date(ms.dueDate).toLocaleDateString()}</span>}
                {ms.completedAt && (
                  <span>Completed: {new Date(ms.completedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  },
);
MissionTimeline.displayName = 'MissionTimeline';

export { MissionTimeline };
