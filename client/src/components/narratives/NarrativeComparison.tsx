import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Narrative, NarrativeConflict } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// NarrativeComparison — side-by-side comparison and conflict detection
// ---------------------------------------------------------------------------

export interface NarrativeComparisonProps extends React.HTMLAttributes<HTMLDivElement> {
  left: Narrative;
  right: Narrative;
  conflicts?: NarrativeConflict[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-red-500/50 bg-red-500/10',
  high: 'border-orange-500/50 bg-orange-500/10',
  medium: 'border-yellow-500/50 bg-yellow-500/10',
  low: 'border-blue-500/50 bg-blue-500/10',
  info: 'border-zinc-500/50 bg-zinc-500/10',
};

const NarrativeComparison = React.forwardRef<HTMLDivElement, NarrativeComparisonProps>(
  ({ className, left, right, conflicts = [], ...props }, ref) => {
    const sharedEntityIds = React.useMemo(() => {
      const ls = new Set(left.entityIds);
      return right.entityIds.filter((id) => ls.has(id));
    }, [left.entityIds, right.entityIds]);

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {/* Side-by-side headers */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{left.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {left.arcs.length} arcs &middot; {left.entityIds.length} entities &middot;{' '}
              {left.eventIds.length} events
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{right.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {right.arcs.length} arcs &middot; {right.entityIds.length} entities &middot;{' '}
              {right.eventIds.length} events
            </CardContent>
          </Card>
        </div>

        {/* Overlap */}
        <div className="rounded-md border p-3">
          <h4 className="text-xs font-medium text-muted-foreground">Shared Entities</h4>
          <p className="mt-1 text-sm">
            {sharedEntityIds.length > 0
              ? `${sharedEntityIds.length} entities in common`
              : 'No shared entities'}
          </p>
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              Conflicts ({conflicts.length})
            </h4>
            {conflicts.map((c) => (
              <div
                key={c.id}
                className={cn('rounded-md border p-3 text-sm', SEVERITY_COLORS[c.severity])}
              >
                {c.description}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
NarrativeComparison.displayName = 'NarrativeComparison';

export { NarrativeComparison };
