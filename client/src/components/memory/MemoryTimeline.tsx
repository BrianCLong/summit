import * as React from 'react';

import { cn } from '@/lib/utils';
import type { TimelineEntry } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// MemoryTimeline — chronological display of investigation events
// ---------------------------------------------------------------------------

export interface MemoryTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  entries: TimelineEntry[];
  onEntrySelect?: (refId: string) => void;
}

const TYPE_COLORS: Record<TimelineEntry['type'], string> = {
  event: 'bg-blue-500',
  hypothesis: 'bg-purple-500',
  evidence: 'bg-green-500',
  note: 'bg-yellow-500',
  finding: 'bg-cyan-500',
  entity_added: 'bg-orange-500',
  status_change: 'bg-zinc-500',
};

const MemoryTimeline = React.forwardRef<HTMLDivElement, MemoryTimelineProps>(
  ({ className, entries, onEntrySelect, ...props }, ref) => {
    const sorted = React.useMemo(
      () => [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      [entries],
    );

    if (sorted.length === 0) {
      return (
        <div ref={ref} className={cn('py-8 text-center text-sm text-muted-foreground', className)} {...props}>
          No timeline entries yet.
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('relative space-y-4 pl-6', className)} {...props}>
        {/* Vertical line */}
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />

        {sorted.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onEntrySelect?.(entry.refId)}
            className="relative flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
          >
            {/* Dot */}
            <span
              className={cn(
                'absolute -left-3.5 top-3 h-2.5 w-2.5 rounded-full ring-2 ring-background',
                TYPE_COLORS[entry.type],
              )}
            />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium">{entry.summary}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.timestamp).toLocaleString()} &middot; {entry.type.replace('_', ' ')}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  },
);
MemoryTimeline.displayName = 'MemoryTimeline';

export { MemoryTimeline };
