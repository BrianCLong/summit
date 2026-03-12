import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Insight } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// InsightGraph — visualize insight relationships and entity overlap
// ---------------------------------------------------------------------------

export interface InsightGraphProps extends React.HTMLAttributes<HTMLDivElement> {
  insights: Insight[];
  onInsightSelect?: (insightId: string) => void;
  onEntitySelect?: (entityId: string) => void;
}

const InsightGraph = React.forwardRef<HTMLDivElement, InsightGraphProps>(
  ({ className, insights, onInsightSelect, onEntitySelect, ...props }, ref) => {
    const nodes = React.useMemo(() => {
      const entitySet = new Map<string, number>();
      for (const i of insights) {
        for (const eid of i.entityIds) {
          entitySet.set(eid, (entitySet.get(eid) ?? 0) + 1);
        }
      }
      return {
        insightNodes: insights.map((i) => ({ id: i.id, label: i.title, type: 'insight' as const })),
        entityNodes: [...entitySet.entries()].map(([id, count]) => ({
          id,
          label: id,
          type: 'entity' as const,
          degree: count,
        })),
      };
    }, [insights]);

    const totalNodes = nodes.insightNodes.length + nodes.entityNodes.length;

    return (
      <Card ref={ref} className={cn('overflow-hidden', className)} {...props}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Insight Graph &middot; {totalNodes} nodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border bg-muted/30">
            {totalNodes === 0 ? (
              <span className="text-sm text-muted-foreground">No insight data</span>
            ) : (
              <div className="flex flex-wrap justify-center gap-2 p-4">
                {nodes.insightNodes.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onInsightSelect?.(n.id)}
                    className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 hover:bg-orange-500/20"
                  >
                    {n.label.length > 30 ? n.label.slice(0, 30) + '...' : n.label}
                  </button>
                ))}
                {nodes.entityNodes
                  .sort((a, b) => b.degree - a.degree)
                  .slice(0, 15)
                  .map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onEntitySelect?.(n.id)}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      {n.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);
InsightGraph.displayName = 'InsightGraph';

export { InsightGraph };
