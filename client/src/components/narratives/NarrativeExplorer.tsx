import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Narrative } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// NarrativeExplorer — browse and filter the narrative library
// ---------------------------------------------------------------------------

export interface NarrativeExplorerProps extends React.HTMLAttributes<HTMLDivElement> {
  narratives: Narrative[];
  onSelect?: (narrativeId: string) => void;
}

const NarrativeExplorer = React.forwardRef<HTMLDivElement, NarrativeExplorerProps>(
  ({ className, narratives, onSelect, ...props }, ref) => {
    const [filter, setFilter] = React.useState('');

    const filtered = React.useMemo(() => {
      const q = filter.toLowerCase().trim();
      if (!q) return narratives;
      return narratives.filter(
        (n) => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q),
      );
    }, [filter, narratives]);

    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter narratives..."
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />

        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No narratives found.</div>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onSelect?.(n.id)}
            >
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{n.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{n.summary}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {n.arcs.length} arcs
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {n.entityIds.length} entities
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {n.eventIds.length} events
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  },
);
NarrativeExplorer.displayName = 'NarrativeExplorer';

export { NarrativeExplorer };
