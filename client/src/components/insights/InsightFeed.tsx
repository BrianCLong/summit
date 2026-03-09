import * as React from 'react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Insight, Severity } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// InsightFeed — live feed of automatically discovered insights
// ---------------------------------------------------------------------------

export interface InsightFeedProps extends React.HTMLAttributes<HTMLDivElement> {
  insights: Insight[];
  onSelect?: (insightId: string) => void;
  onAcknowledge?: (insightId: string) => void;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  info: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

const InsightFeed = React.forwardRef<HTMLDivElement, InsightFeedProps>(
  ({ className, insights, onSelect, onAcknowledge, ...props }, ref) => {
    const sorted = React.useMemo(
      () => [...insights].sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()),
      [insights],
    );

    if (sorted.length === 0) {
      return (
        <div ref={ref} className={cn('py-8 text-center text-sm text-muted-foreground', className)} {...props}>
          No insights discovered yet.
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {sorted.map((insight) => (
          <button
            key={insight.id}
            onClick={() => onSelect?.(insight.id)}
            className={cn(
              'flex flex-col gap-1 rounded-md border p-3 text-left transition-colors hover:bg-muted/50',
              insight.acknowledgedAt && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px]', SEVERITY_STYLES[insight.severity])}>
                {insight.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {insight.type.replace('_', ' ')}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {Math.round(insight.confidence * 100)}%
              </span>
            </div>
            <span className="text-sm font-medium">{insight.title}</span>
            <span className="text-xs text-muted-foreground line-clamp-2">{insight.description}</span>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{new Date(insight.discoveredAt).toLocaleString()}</span>
              <span>{insight.source.replace('_', ' ')}</span>
              {insight.actionable && !insight.acknowledgedAt && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcknowledge?.(insight.id);
                  }}
                  className="rounded-sm bg-primary/10 px-2 py-0.5 font-medium text-primary hover:bg-primary/20"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  },
);
InsightFeed.displayName = 'InsightFeed';

export { InsightFeed };
