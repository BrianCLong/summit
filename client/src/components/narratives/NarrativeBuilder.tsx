import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Narrative, NarrativeArc } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// NarrativeBuilder — construct and edit intelligence narratives
// ---------------------------------------------------------------------------

export interface NarrativeBuilderProps extends React.HTMLAttributes<HTMLDivElement> {
  narrative?: Narrative;
  onUpdate?: (narrative: Partial<Narrative>) => void;
  onArcAdd?: (arc: Omit<NarrativeArc, 'id'>) => void;
}

const TREND_ICONS: Record<NarrativeArc['trend'], string> = {
  escalating: '\u2191',
  stable: '\u2192',
  'de-escalating': '\u2193',
};

const TREND_COLORS: Record<NarrativeArc['trend'], string> = {
  escalating: 'text-red-400',
  stable: 'text-yellow-400',
  'de-escalating': 'text-green-400',
};

const NarrativeBuilder = React.forwardRef<HTMLDivElement, NarrativeBuilderProps>(
  ({ className, narrative, onUpdate, onArcAdd, ...props }, ref) => {
    const [title, setTitle] = React.useState(narrative?.title ?? '');
    const [summary, setSummary] = React.useState(narrative?.summary ?? '');

    const handleTitleBlur = React.useCallback(() => {
      if (title !== narrative?.title) onUpdate?.({ title });
    }, [title, narrative?.title, onUpdate]);

    const handleSummaryBlur = React.useCallback(() => {
      if (summary !== narrative?.summary) onUpdate?.({ summary });
    }, [summary, narrative?.summary, onUpdate]);

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {/* Title & summary */}
        <Card>
          <CardHeader className="pb-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Narrative title..."
              className="bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={handleSummaryBlur}
              placeholder="Narrative summary..."
              rows={3}
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </CardContent>
        </Card>

        {/* Arcs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Story Arcs</h3>
            <button
              onClick={() =>
                onArcAdd?.({ label: 'New Arc', events: [], sentiment: 0, trend: 'stable' })
              }
              className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              + Add Arc
            </button>
          </div>

          {narrative?.arcs.map((arc) => (
            <Card key={arc.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className={cn('text-lg', TREND_COLORS[arc.trend])}>
                  {TREND_ICONS[arc.trend]}
                </span>
                <div className="flex-1">
                  <span className="text-sm font-medium">{arc.label}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{arc.events.length} events</span>
                    <Badge variant="outline" className="text-[10px]">
                      {arc.trend}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  sentiment: {arc.sentiment > 0 ? '+' : ''}{arc.sentiment.toFixed(2)}
                </span>
              </CardContent>
            </Card>
          ))}

          {(!narrative?.arcs || narrative.arcs.length === 0) && (
            <div className="py-4 text-center text-xs text-muted-foreground">No arcs yet.</div>
          )}
        </div>

        {/* Linked entities / events counts */}
        {narrative && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{narrative.entityIds.length} linked entities</span>
            <span>{narrative.eventIds.length} linked events</span>
            <span>{narrative.sourceIds.length} sources</span>
          </div>
        )}
      </div>
    );
  },
);
NarrativeBuilder.displayName = 'NarrativeBuilder';

export { NarrativeBuilder };
