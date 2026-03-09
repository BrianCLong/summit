import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Entity, IntelEvent } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// MemoryGraph — entity / event relationship graph visualization stub
// Integrates with IntelGraph via Cytoscape.js (or other graph renderer).
// ---------------------------------------------------------------------------

export interface MemoryGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  entities: Entity[];
  events: IntelEvent[];
  onEntitySelect?: (entityId: string) => void;
}

const MemoryGraph = React.forwardRef<HTMLDivElement, MemoryGraphProps>(
  ({ className, entities, events, onEntitySelect, ...props }, ref) => {
    const graphRef = React.useRef<HTMLDivElement>(null);

    const nodes = React.useMemo(
      () => [
        ...entities.map((e) => ({ id: e.id, label: e.label, group: 'entity' as const })),
        ...events.map((ev) => ({ id: ev.id, label: ev.title, group: 'event' as const })),
      ],
      [entities, events],
    );

    const edges = React.useMemo(() => {
      const result: { source: string; target: string }[] = [];
      for (const ev of events) {
        for (const eid of ev.entityIds) {
          result.push({ source: ev.id, target: eid });
        }
      }
      return result;
    }, [events]);

    return (
      <Card ref={ref} className={cn('overflow-hidden', className)} {...props}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Memory Graph &middot; {nodes.length} nodes &middot; {edges.length} edges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Graph render target — Cytoscape / D3 mounts here */}
          <div
            ref={graphRef}
            className="relative flex h-80 items-center justify-center rounded-md border bg-muted/30"
          >
            {nodes.length === 0 ? (
              <span className="text-sm text-muted-foreground">No graph data available</span>
            ) : (
              <div className="flex flex-wrap justify-center gap-2 p-4">
                {nodes.slice(0, 30).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => n.group === 'entity' && onEntitySelect?.(n.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      n.group === 'entity'
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : 'bg-secondary/10 text-secondary-foreground hover:bg-secondary/20',
                    )}
                  >
                    {n.label}
                  </button>
                ))}
                {nodes.length > 30 && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    +{nodes.length - 30} more
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);
MemoryGraph.displayName = 'MemoryGraph';

export { MemoryGraph };
