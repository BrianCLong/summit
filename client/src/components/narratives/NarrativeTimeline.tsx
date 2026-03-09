import * as React from 'react';

import { cn } from '@/lib/utils';
import type { NarrativeArc } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// NarrativeTimeline — visualize story arcs along a timeline
// ---------------------------------------------------------------------------

export interface NarrativeTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  arcs: NarrativeArc[];
  onEventSelect?: (eventId: string) => void;
}

const ARC_COLORS = [
  'bg-blue-500/20 border-blue-500/40',
  'bg-purple-500/20 border-purple-500/40',
  'bg-green-500/20 border-green-500/40',
  'bg-orange-500/20 border-orange-500/40',
  'bg-cyan-500/20 border-cyan-500/40',
];

const NarrativeTimeline = React.forwardRef<HTMLDivElement, NarrativeTimelineProps>(
  ({ className, arcs, onEventSelect, ...props }, ref) => {
    if (arcs.length === 0) {
      return (
        <div ref={ref} className={cn('py-8 text-center text-sm text-muted-foreground', className)} {...props}>
          No narrative arcs to display.
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {arcs.map((arc, idx) => (
          <div key={arc.id} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{arc.label}</span>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {arc.events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onEventSelect?.(ev.eventId)}
                  className={cn(
                    'shrink-0 rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted/50',
                    ARC_COLORS[idx % ARC_COLORS.length],
                  )}
                >
                  {ev.annotation || `Event #${ev.position + 1}`}
                </button>
              ))}
              {arc.events.length === 0 && (
                <span className="text-xs text-muted-foreground">No events in this arc.</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  },
);
NarrativeTimeline.displayName = 'NarrativeTimeline';

export { NarrativeTimeline };
