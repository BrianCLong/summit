import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { IntelEvent } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// EventSearch — event-specific search with time-range filtering
// ---------------------------------------------------------------------------

export interface EventSearchProps extends React.HTMLAttributes<HTMLDivElement> {
  events: IntelEvent[];
  onSelect?: (event: IntelEvent) => void;
}

const EventSearch = React.forwardRef<HTMLDivElement, EventSearchProps>(
  ({ className, events, onSelect, ...props }, ref) => {
    const [query, setQuery] = React.useState('');

    const filtered = React.useMemo(() => {
      const q = query.toLowerCase().trim();
      if (!q) return events;
      return events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q),
      );
    }, [events, query]);

    const sorted = React.useMemo(
      () => [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      [filtered],
    );

    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events..."
        />

        <div className="text-xs text-muted-foreground">{sorted.length} events</div>

        <div className="flex flex-col gap-1">
          {sorted.slice(0, 50).map((ev) => (
            <button
              key={ev.id}
              onClick={() => onSelect?.(ev)}
              className="flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ev.type}
                </span>
                <span className="text-sm font-medium">{ev.title}</span>
              </div>
              <span className="text-xs text-muted-foreground line-clamp-1">{ev.description}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(ev.timestamp).toLocaleString()}
              </span>
            </button>
          ))}
          {sorted.length > 50 && (
            <span className="py-2 text-center text-xs text-muted-foreground">
              +{sorted.length - 50} more events
            </span>
          )}
        </div>
      </div>
    );
  },
);
EventSearch.displayName = 'EventSearch';

export { EventSearch };
