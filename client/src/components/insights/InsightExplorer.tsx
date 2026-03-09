import * as React from 'react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Insight } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// InsightExplorer — filter and browse insights with faceted search
// ---------------------------------------------------------------------------

export interface InsightExplorerProps extends React.HTMLAttributes<HTMLDivElement> {
  insights: Insight[];
  onSelect?: (insightId: string) => void;
}

const TYPES: Insight['type'][] = ['anomaly', 'hidden_relationship', 'emerging_threat', 'investigative_lead', 'pattern'];
const SOURCES: Insight['source'][] = ['intelgraph', 'evolution_intelligence', 'threat_intel', 'pattern_miner'];

const InsightExplorer = React.forwardRef<HTMLDivElement, InsightExplorerProps>(
  ({ className, insights, onSelect, ...props }, ref) => {
    const [selectedTypes, setSelectedTypes] = React.useState<Set<string>>(new Set());
    const [selectedSources, setSelectedSources] = React.useState<Set<string>>(new Set());

    const toggle = React.useCallback(
      (set: Set<string>, value: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
        setter((prev) => {
          const next = new Set(prev);
          if (next.has(value)) next.delete(value);
          else next.add(value);
          return next;
        });
      },
      [],
    );

    const filtered = React.useMemo(() => {
      return insights.filter((i) => {
        if (selectedTypes.size > 0 && !selectedTypes.has(i.type)) return false;
        if (selectedSources.size > 0 && !selectedSources.has(i.source)) return false;
        return true;
      });
    }, [insights, selectedTypes, selectedSources]);

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {/* Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggle(selectedTypes, t, setSelectedTypes)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors',
                  selectedTypes.has(t)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => toggle(selectedSources, s, setSelectedSources)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors',
                  selectedSources.has(s)
                    ? 'border-secondary bg-secondary/10 text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="text-xs text-muted-foreground">{filtered.length} insights</div>
        <div className="flex flex-col gap-2">
          {filtered.map((insight) => (
            <button
              key={insight.id}
              onClick={() => onSelect?.(insight.id)}
              className="flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex-1">
                <span className="text-sm font-medium">{insight.title}</span>
                <p className="text-xs text-muted-foreground line-clamp-1">{insight.description}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {insight.severity}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    );
  },
);
InsightExplorer.displayName = 'InsightExplorer';

export { InsightExplorer };
